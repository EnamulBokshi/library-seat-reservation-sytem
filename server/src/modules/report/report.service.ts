import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { Prisma } from "../../generated/client";
import { ReportCategory, ReportPriority, ReportStatus, Role } from "../../generated/enums";
import { emailService } from "../../services/email.service";
import {
    ICreateReportPayload,
    IReportFilterOptions,
    IUpdateReportStatusPayload,
} from "./report.interface";

const REPORT_INCLUDE = {
    reporter: { select: { id: true, name: true, email: true, role: true, studentId: true, facultyId: true } },
    handledBy: { select: { id: true, name: true, role: true } },
} as const;

const SORT_FIELDS = ["createdAt", "updatedAt", "priority", "status"] as const;

/** Statuses that still need someone to act. */
const OPEN_STATUSES: ReportStatus[] = [ReportStatus.open, ReportStatus.in_review];

/**
 * A student or faculty member files a report. It lands in the staff queue as
 * `open`; the reporter can follow it from their own list.
 */
const createReport = async (reporterId: string, payload: ICreateReportPayload) => {
    const report = await prisma.report.create({
        data: {
            reporterId,
            category: payload.category as ReportCategory,
            subject: payload.subject,
            description: payload.description,
            priority: (payload.priority as ReportPriority) ?? ReportPriority.normal,
            location: payload.location?.trim() || null,
        },
        include: REPORT_INCLUDE,
    });

    // Staff are told, but a mail failure must not lose the report itself.
    const staff = await prisma.user.findMany({
        where: { role: { in: [Role.admin, Role.librarian] }, isActive: true },
        select: { email: true },
    });

    await emailService
        .sendReportFiledEmail({
            toEmails: staff.map((s) => s.email),
            reporterName: report.reporter.name,
            reporterRole: report.reporter.role,
            category: report.category,
            subject: report.subject,
            description: report.description,
            location: report.location,
            priority: report.priority,
        })
        .catch((err) => console.error("Failed to notify staff of a new report:", err));

    return report;
};

/** The reporter's own reports, newest first. */
const getMyReports = async (reporterId: string, options: IReportFilterOptions = {}) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 10));

    const where: Prisma.ReportWhereInput = { reporterId };
    if (options.status) where.status = options.status as ReportStatus;
    if (options.category) where.category = options.category as ReportCategory;

    const [reports, total, openCount] = await Promise.all([
        prisma.report.findMany({
            where,
            include: REPORT_INCLUDE,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.report.count({ where }),
        prisma.report.count({ where: { reporterId, status: { in: OPEN_STATUSES } } }),
    ]);

    return {
        reports,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            counts: { open: openCount },
        },
    };
};

/** The staff queue: every report, filtered, sorted and paged. */
const getAllReports = async (options: IReportFilterOptions) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const sortBy = SORT_FIELDS.includes(options.sortBy as (typeof SORT_FIELDS)[number])
        ? (options.sortBy as (typeof SORT_FIELDS)[number])
        : "createdAt";
    const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";

    const where: Prisma.ReportWhereInput = {};
    if (options.status) where.status = options.status as ReportStatus;
    if (options.category) where.category = options.category as ReportCategory;
    if (options.priority) where.priority = options.priority as ReportPriority;
    if (options.searchTerm?.trim()) {
        const term = options.searchTerm.trim();
        where.OR = [
            { subject: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
            { location: { contains: term, mode: "insensitive" } },
            { reporter: { name: { contains: term, mode: "insensitive" } } },
            { reporter: { email: { contains: term, mode: "insensitive" } } },
        ];
    }

    const [reports, total, statusCounts] = await Promise.all([
        prisma.report.findMany({
            where,
            include: REPORT_INCLUDE,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.report.count({ where }),
        prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const counts = { open: 0, in_review: 0, resolved: 0, dismissed: 0 };
    for (const row of statusCounts) {
        counts[row.status as keyof typeof counts] = row._count._all;
    }

    return {
        reports,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            counts,
        },
    };
};

/**
 * One report. A reporter may only open their own; staff may open any.
 */
const getReportById = async (id: string, userId: string, role: Role) => {
    const report = await prisma.report.findUnique({ where: { id }, include: REPORT_INCLUDE });

    if (!report) {
        throw new AppError(status.NOT_FOUND, "Report not found");
    }

    const isStaff = role === Role.admin || role === Role.librarian;
    if (!isStaff && report.reporterId !== userId) {
        throw new AppError(status.FORBIDDEN, "You can only view your own reports");
    }

    return report;
};

/**
 * Staff move a report along and reply to the reporter. Reaching a closed state
 * stamps who handled it and when; reopening clears that stamp.
 */
const updateReportStatus = async (
    id: string,
    staffId: string,
    payload: IUpdateReportStatusPayload
) => {
    const report = await prisma.report.findUnique({ where: { id }, include: REPORT_INCLUDE });

    if (!report) {
        throw new AppError(status.NOT_FOUND, "Report not found");
    }

    const nextStatus = payload.status as ReportStatus;
    const isClosing = nextStatus === ReportStatus.resolved || nextStatus === ReportStatus.dismissed;

    const updated = await prisma.report.update({
        where: { id },
        data: {
            status: nextStatus,
            priority: (payload.priority as ReportPriority) ?? undefined,
            staffNote: payload.staffNote ?? undefined,
            handledById: isClosing ? staffId : null,
            handledAt: isClosing ? new Date() : null,
        },
        include: REPORT_INCLUDE,
    });

    if (report.status !== nextStatus) {
        await emailService
            .sendReportStatusEmail({
                toEmail: updated.reporter.email,
                reporterName: updated.reporter.name,
                subject: updated.subject,
                statusLabel: nextStatus,
                staffNote: updated.staffNote,
            })
            .catch((err) => console.error("Failed to send a report status email:", err));
    }

    return updated;
};

export const ReportService = {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    updateReportStatus,
};
