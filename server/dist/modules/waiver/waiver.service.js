"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiverService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const enums_1 = require("../../generated/enums");
const email_service_1 = require("../../services/email.service");
const fine_service_1 = require("../fine/fine.service");
const REQUEST_INCLUDE = {
    requestedBy: { select: { id: true, name: true, email: true, department: true } },
    targetUser: { select: { id: true, name: true, email: true, studentId: true } },
};
/** Addresses that decide waiver petitions. */
const getApproverEmails = async () => {
    const approvers = await prisma_1.default.user.findMany({
        where: { role: enums_1.Role.admin, isActive: true },
        select: { email: true },
    });
    return approvers.map((a) => a.email);
};
/**
 * Load the fine a petition points at and assert it is still outstanding.
 * A settled or already-waived fine cannot be petitioned.
 */
const loadPetitionableFine = async (payload) => {
    if (payload.bookingId) {
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: payload.bookingId },
            select: { id: true, userId: true, fineAmount: true, fineStatus: true },
        });
        if (!booking) {
            throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Seat reservation not found");
        }
        if (booking.userId !== payload.targetUserId) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "That reservation does not belong to the named student");
        }
        if (booking.fineAmount <= 0 || booking.fineStatus !== enums_1.FineStatus.unpaid) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "That reservation has no unpaid fine to waive");
        }
        return { amount: booking.fineAmount, fineType: "seat reservation" };
    }
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: payload.loanId },
        select: { id: true, userId: true, fineAmount: true, fineStatus: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Book loan not found");
    }
    if (loan.userId !== payload.targetUserId) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "That loan does not belong to the named student");
    }
    if (loan.fineAmount <= 0 || loan.fineStatus !== enums_1.FineStatus.unpaid) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "That loan has no unpaid fine to waive");
    }
    return { amount: loan.fineAmount, fineType: "book loan" };
};
/**
 * A faculty member petitions an admin to clear one student fine.
 */
const createWaiverRequest = async (requestedById, payload) => {
    const targetUser = await prisma_1.default.user.findUnique({
        where: { id: payload.targetUserId },
        select: { id: true, name: true },
    });
    if (!targetUser) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Student account not found");
    }
    const { amount, fineType } = await loadPetitionableFine(payload);
    // One open petition per fine, whoever raised it.
    const existing = await prisma_1.default.fineWaiverRequest.findFirst({
        where: {
            status: enums_1.WaiverRequestStatus.pending,
            ...(payload.bookingId ? { bookingId: payload.bookingId } : { loanId: payload.loanId }),
        },
    });
    if (existing) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A waiver request for this fine is already pending");
    }
    const request = await prisma_1.default.fineWaiverRequest.create({
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
    await email_service_1.emailService
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
const lookupStudentFines = async (identifier) => {
    const cleanId = identifier.trim();
    const student = await prisma_1.default.user.findFirst({
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
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, `No account found matching "${identifier}".`);
    }
    const [bookings, loans, pendingRequests] = await Promise.all([
        prisma_1.default.booking.findMany({
            where: { userId: student.id, fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
            select: {
                id: true,
                fineAmount: true,
                cancelReason: true,
                cancelledAt: true,
                schedule: { select: { date: true, slot: true } },
            },
            orderBy: { cancelledAt: "desc" },
        }),
        prisma_1.default.bookLoan.findMany({
            where: { userId: student.id, fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
            select: {
                id: true,
                fineAmount: true,
                dueDate: true,
                book: { select: { title: true } },
            },
            orderBy: { dueDate: "asc" },
        }),
        prisma_1.default.fineWaiverRequest.findMany({
            where: { targetUserId: student.id, status: enums_1.WaiverRequestStatus.pending },
            select: { bookingId: true, loanId: true },
        }),
    ]);
    const pendingBookingIds = new Set(pendingRequests.map((r) => r.bookingId).filter(Boolean));
    const pendingLoanIds = new Set(pendingRequests.map((r) => r.loanId).filter(Boolean));
    const seatFines = bookings.map((b) => ({
        id: b.id,
        source: "booking",
        amount: b.fineAmount,
        subject: `${new Date(b.schedule.date).toISOString().split("T")[0]} · ${b.schedule.slot}`,
        reason: b.cancelReason,
        incurredAt: b.cancelledAt,
        hasPendingRequest: pendingBookingIds.has(b.id),
    }));
    const loanFines = loans.map((l) => ({
        id: l.id,
        source: "loan",
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
const getMyWaiverRequests = async (requestedById) => {
    return prisma_1.default.fineWaiverRequest.findMany({
        where: { requestedById },
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
};
/** Admin queue, newest first, optionally filtered by decision state. */
const getAllWaiverRequests = async (options) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const where = options.status ? { status: options.status } : {};
    const [requests, total] = await Promise.all([
        prisma_1.default.fineWaiverRequest.findMany({
            where,
            include: REQUEST_INCLUDE,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.fineWaiverRequest.count({ where }),
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
const decideWaiverRequest = async (requestId, adminId, payload) => {
    const request = await prisma_1.default.fineWaiverRequest.findUnique({
        where: { id: requestId },
        include: REQUEST_INCLUDE,
    });
    if (!request) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Waiver request not found");
    }
    if (request.status !== enums_1.WaiverRequestStatus.pending) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `This request was already ${request.status} and cannot be decided again.`);
    }
    const approved = payload.status === "approved";
    if (approved) {
        const source = request.bookingId ? "seat" : "loan";
        const fineId = request.bookingId ?? request.loanId;
        if (!fineId) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This request no longer references a fine");
        }
        // Waiving first means a failure here (already paid, already waived)
        // aborts before the petition is marked decided.
        await fine_service_1.FineService.waiveFine(source, fineId, {
            reason: `Waived on faculty request by ${request.requestedBy.name}: ${request.reason}`,
        }, adminId);
    }
    const decided = await prisma_1.default.fineWaiverRequest.update({
        where: { id: requestId },
        data: {
            status: approved ? enums_1.WaiverRequestStatus.approved : enums_1.WaiverRequestStatus.rejected,
            decidedById: adminId,
            decidedAt: new Date(),
            decisionNote: payload.decisionNote || null,
        },
        include: REQUEST_INCLUDE,
    });
    await email_service_1.emailService
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
exports.WaiverService = {
    createWaiverRequest,
    lookupStudentFines,
    getMyWaiverRequests,
    getAllWaiverRequests,
    decideWaiverRequest,
};
