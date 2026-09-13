import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { FineStatus, Role, WaiverRequestStatus } from "../../generated/enums";
import { emailService } from "../../services/email.service";
import { FineService } from "../fine/fine.service";
import {
    ICreateWaiverRequestPayload,
    IDecideWaiverRequestPayload,
    IWaiverFilterOptions,
} from "./waiver.interface";

const REQUEST_INCLUDE = {
    requestedBy: { select: { id: true, name: true, email: true, department: true } },
    targetUser: { select: { id: true, name: true, email: true, studentId: true } },
} as const;

/** Addresses that decide waiver petitions. */
const getApproverEmails = async (): Promise<string[]> => {
    const approvers = await prisma.user.findMany({
        where: { role: Role.admin, isActive: true },
        select: { email: true },
    });
    return approvers.map((a) => a.email);
};

/**
 * Load the fine a petition points at and assert it is still outstanding.
 * A settled or already-waived fine cannot be petitioned.
 */
const loadPetitionableFine = async (payload: ICreateWaiverRequestPayload) => {
    if (payload.bookingId) {
        const booking = await prisma.booking.findUnique({
            where: { id: payload.bookingId },
            select: { id: true, userId: true, fineAmount: true, fineStatus: true },
        });

        if (!booking) {
            throw new AppError(status.NOT_FOUND, "Seat reservation not found");
        }
        if (booking.userId !== payload.targetUserId) {
            throw new AppError(status.BAD_REQUEST, "That reservation does not belong to the named student");
        }
        if (booking.fineAmount <= 0 || booking.fineStatus !== FineStatus.unpaid) {
            throw new AppError(
                status.BAD_REQUEST,
                "That reservation has no unpaid fine to waive"
            );
        }

        return { amount: booking.fineAmount, fineType: "seat reservation" as const };
    }

    const loan = await prisma.bookLoan.findUnique({
        where: { id: payload.loanId },
        select: { id: true, userId: true, fineAmount: true, fineStatus: true },
    });

    if (!loan) {
        throw new AppError(status.NOT_FOUND, "Book loan not found");
    }
    if (loan.userId !== payload.targetUserId) {
        throw new AppError(status.BAD_REQUEST, "That loan does not belong to the named student");
    }
    if (loan.fineAmount <= 0 || loan.fineStatus !== FineStatus.unpaid) {
        throw new AppError(status.BAD_REQUEST, "That loan has no unpaid fine to waive");
    }

    return { amount: loan.fineAmount, fineType: "book loan" as const };
};

/**
 * A faculty member petitions an admin to clear one student fine.
 */
const createWaiverRequest = async (
    requestedById: string,
    payload: ICreateWaiverRequestPayload
) => {
    const targetUser = await prisma.user.findUnique({
        where: { id: payload.targetUserId },
        select: { id: true, name: true },
    });

    if (!targetUser) {
        throw new AppError(status.NOT_FOUND, "Student account not found");
    }

    const { amount, fineType } = await loadPetitionableFine(payload);

    // One open petition per fine, whoever raised it.
    const existing = await prisma.fineWaiverRequest.findFirst({
        where: {
            status: WaiverRequestStatus.pending,
            ...(payload.bookingId ? { bookingId: payload.bookingId } : { loanId: payload.loanId }),
        },
    });

    if (existing) {
        throw new AppError(status.CONFLICT, "A waiver request for this fine is already pending");
    }

    const request = await prisma.fineWaiverRequest.create({
        data: {
            requestedById,
            targetUserId: payload.targetUserId,
            bookingId: payload.bookingId || null,
            loanId: payload.loanId || null,
            amount,
            reason: payload.reason,
        },
        include: REQUEST_INCLUDE,
    });

    const approverEmails = await getApproverEmails();
    await emailService
        .sendWaiverRequestedEmail({
            toEmails: approverEmails,
            facultyName: request.requestedBy.name,
            targetName: request.targetUser.name,
            amount,
            reason: payload.reason,
            fineType,
        })
        .catch((err) => console.error("Failed to notify admins of waiver request:", err));

    return request;
};

/**
 * Find a student by ID, email or uuid and list the fines a faculty member can
 * petition for. Only unpaid fines are returned — settled and waived ones are
 * not petitionable.
 */
const lookupStudentFines = async (identifier: string) => {
    const cleanId = identifier.trim();

    const student = await prisma.user.findFirst({
        where: {
            OR: [
                { id: cleanId },
                { studentId: cleanId },
                { email: { equals: cleanId, mode: "insensitive" } },
            ],
        },
        select: { id: true, name: true, email: true, studentId: true, role: true },
    });

    if (!student) {
        throw new AppError(status.NOT_FOUND, `No account found matching "${identifier}".`);
    }

    const [bookings, loans, pendingRequests] = await Promise.all([
        prisma.booking.findMany({
            where: { userId: student.id, fineStatus: FineStatus.unpaid, fineAmount: { gt: 0 } },
            select: {
                id: true,
                fineAmount: true,
                cancelReason: true,
                cancelledAt: true,
                schedule: { select: { date: true, slot: true } },
            },
            orderBy: { cancelledAt: "desc" },
        }),
        prisma.bookLoan.findMany({
            where: { userId: student.id, fineStatus: FineStatus.unpaid, fineAmount: { gt: 0 } },
            select: {
                id: true,
                fineAmount: true,
                dueDate: true,
                book: { select: { title: true } },
            },
            orderBy: { dueDate: "asc" },
        }),
        prisma.fineWaiverRequest.findMany({
            where: { targetUserId: student.id, status: WaiverRequestStatus.pending },
            select: { bookingId: true, loanId: true },
        }),
    ]);

    const pendingBookingIds = new Set(pendingRequests.map((r) => r.bookingId).filter(Boolean));
    const pendingLoanIds = new Set(pendingRequests.map((r) => r.loanId).filter(Boolean));

    const seatFines = bookings.map((b) => ({
        id: b.id,
        source: "booking" as const,
        amount: b.fineAmount,
        subject: `${new Date(b.schedule.date).toISOString().split("T")[0]} · ${b.schedule.slot}`,
        reason: b.cancelReason,
        incurredAt: b.cancelledAt,
        hasPendingRequest: pendingBookingIds.has(b.id),
    }));

    const loanFines = loans.map((l) => ({
        id: l.id,
        source: "loan" as const,
        amount: l.fineAmount,
        subject: l.book.title,
        reason: "Overdue book loan",
        incurredAt: l.dueDate,
        hasPendingRequest: pendingLoanIds.has(l.id),
    }));

    const totalUnpaid = [...seatFines, ...loanFines].reduce((sum, f) => sum + f.amount, 0);

    return {
        student,
        fines: [...seatFines, ...loanFines],
        totalUnpaid: Math.round(totalUnpaid * 100) / 100,
    };
};

/** Petitions raised by one faculty member. */
const getMyWaiverRequests = async (requestedById: string) => {
    return prisma.fineWaiverRequest.findMany({
        where: { requestedById },
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
};

/** Admin queue, newest first, optionally filtered by decision state. */
const getAllWaiverRequests = async (options: IWaiverFilterOptions) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const where = options.status ? { status: options.status as WaiverRequestStatus } : {};

    const [requests, total] = await Promise.all([
        prisma.fineWaiverRequest.findMany({
            where,
            include: REQUEST_INCLUDE,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.fineWaiverRequest.count({ where }),
    ]);

    return {
        requests,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

/**
 * Admin decides a petition. Approval waives the underlying fine through the
 * existing fine settlement path, so the booking / loan ledger stays the
 * single source of truth for fine state.
 */
const decideWaiverRequest = async (
    requestId: string,
    adminId: string,
    payload: IDecideWaiverRequestPayload
) => {
    const request = await prisma.fineWaiverRequest.findUnique({
        where: { id: requestId },
        include: REQUEST_INCLUDE,
    });

    if (!request) {
        throw new AppError(status.NOT_FOUND, "Waiver request not found");
    }

    if (request.status !== WaiverRequestStatus.pending) {
        throw new AppError(
            status.BAD_REQUEST,
            `This request was already ${request.status} and cannot be decided again.`
        );
    }

    const approved = payload.status === "approved";

    if (approved) {
        const source = request.bookingId ? "seat" : "loan";
        const fineId = request.bookingId ?? request.loanId;

        if (!fineId) {
            throw new AppError(status.BAD_REQUEST, "This request no longer references a fine");
        }

        // Waiving first means a failure here (already paid, already waived)
        // aborts before the petition is marked decided.
        await FineService.waiveFine(
            source,
            fineId,
            {
                reason: `Waived on faculty request by ${request.requestedBy.name}: ${request.reason}`,
            },
            adminId
        );
    }

    const decided = await prisma.fineWaiverRequest.update({
        where: { id: requestId },
        data: {
            status: approved ? WaiverRequestStatus.approved : WaiverRequestStatus.rejected,
            decidedById: adminId,
            decidedAt: new Date(),
            decisionNote: payload.decisionNote || null,
        },
        include: REQUEST_INCLUDE,
    });

    await emailService
        .sendWaiverDecisionEmail({
            toEmail: decided.requestedBy.email,
            recipientName: decided.requestedBy.name,
            targetName: decided.targetUser.name,
            amount: decided.amount,
            approved,
            decisionNote: payload.decisionNote || null,
        })
        .catch((err) => console.error("Failed to send waiver decision email:", err));

    return decided;
};

export const WaiverService = {
    createWaiverRequest,
    lookupStudentFines,
    getMyWaiverRequests,
    getAllWaiverRequests,
    decideWaiverRequest,
};
