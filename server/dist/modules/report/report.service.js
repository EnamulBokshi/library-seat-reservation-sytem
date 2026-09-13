"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const enums_1 = require("../../generated/enums");
const email_service_1 = require("../../services/email.service");
const REPORT_INCLUDE = {
    reporter: { select: { id: true, name: true, email: true, role: true, studentId: true, facultyId: true } },
    handledBy: { select: { id: true, name: true, role: true } },
};
const SORT_FIELDS = ["createdAt", "updatedAt", "priority", "status"];
/** Statuses that still need someone to act. */
const OPEN_STATUSES = [enums_1.ReportStatus.open, enums_1.ReportStatus.in_review];
/**
 * A student or faculty member files a report. It lands in the staff queue as
 * `open`; the reporter can follow it from their own list.
 */
const createReport = async (reporterId, payload) => {
    const report = await prisma_1.default.report.create({
        data: {
            reporterId,
            category: payload.category,
            subject: payload.subject,
            description: payload.description,
            priority: payload.priority ?? enums_1.ReportPriority.normal,
            location: payload.location?.trim() || null,
        },
        include: REPORT_INCLUDE,
    });
    // Staff are told, but a mail failure must not lose the report itself.
    const staff = await prisma_1.default.user.findMany({
        where: { role: { in: [enums_1.Role.admin, enums_1.Role.librarian] }, isActive: true },
        select: { email: true },
    });
    await email_service_1.emailService
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
const getMyReports = async (reporterId, options = {}) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 10));
    const where = { reporterId };
    if (options.status)
        where.status = options.status;
    if (options.category)
        where.category = options.category;
    const [reports, total, openCount] = await Promise.all([
        prisma_1.default.report.findMany({
            where,
            include: REPORT_INCLUDE,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.report.count({ where }),
        prisma_1.default.report.count({ where: { reporterId, status: { in: OPEN_STATUSES } } }),
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
const getAllReports = async (options) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const sortBy = SORT_FIELDS.includes(options.sortBy)
        ? options.sortBy
        : "createdAt";
    const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";
    const where = {};
    if (options.status)
        where.status = options.status;
    if (options.category)
        where.category = options.category;
    if (options.priority)
        where.priority = options.priority;
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
        prisma_1.default.report.findMany({
            where,
            include: REPORT_INCLUDE,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.report.count({ where }),
        prisma_1.default.report.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const counts = { open: 0, in_review: 0, resolved: 0, dismissed: 0 };
    for (const row of statusCounts) {
        counts[row.status] = row._count._all;
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
const getReportById = async (id, userId, role) => {
    const report = await prisma_1.default.report.findUnique({ where: { id }, include: REPORT_INCLUDE });
    if (!report) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Report not found");
    }
    const isStaff = role === enums_1.Role.admin || role === enums_1.Role.librarian;
    if (!isStaff && report.reporterId !== userId) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "You can only view your own reports");
    }
    return report;
};
/**
 * Staff move a report along and reply to the reporter. Reaching a closed state
 * stamps who handled it and when; reopening clears that stamp.
 */
const updateReportStatus = async (id, staffId, payload) => {
    const report = await prisma_1.default.report.findUnique({ where: { id }, include: REPORT_INCLUDE });
    if (!report) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Report not found");
    }
    const nextStatus = payload.status;
    const isClosing = nextStatus === enums_1.ReportStatus.resolved || nextStatus === enums_1.ReportStatus.dismissed;
    const updated = await prisma_1.default.report.update({
        where: { id },
        data: {
            status: nextStatus,
            priority: payload.priority ?? undefined,
            staffNote: payload.staffNote ?? undefined,
            handledById: isClosing ? staffId : null,
            handledAt: isClosing ? new Date() : null,
        },
        include: REPORT_INCLUDE,
    });
    if (report.status !== nextStatus) {
        await email_service_1.emailService
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
exports.ReportService = {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    updateReportStatus,
};
