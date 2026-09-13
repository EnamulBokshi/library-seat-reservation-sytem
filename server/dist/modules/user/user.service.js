"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const envVars_1 = require("../../config/envVars");
const enums_1 = require("../../generated/enums");
const email_service_1 = require("../../services/email.service");
const otp_1 = require("../../lib/otp");
const privileges_1 = require("../../lib/privileges");
const enums_2 = require("../../generated/enums");
const setting_service_1 = require("../../modules/setting/setting.service");
const PROFILE_SELECT = {
    id: true,
    name: true,
    email: true,
    studentId: true,
    facultyId: true,
    department: true,
    designation: true,
    role: true,
    isActive: true,
    approvalStatus: true,
    emailVerifiedAt: true,
    rejectionReason: true,
    createdAt: true,
};
const roundBDT = (amount) => Math.round(amount * 100) / 100;
const assertPassword = async (passwordHash, candidate) => {
    const isValid = await bcryptjs_1.default.compare(candidate, passwordHash);
    if (!isValid) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Current password is incorrect");
    }
};
const getUserOrThrow = async (userId) => {
    const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User account not found");
    }
    return user;
};
const getProfile = async (userId) => {
    const user = await prisma_1.default.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User account not found");
    }
    return user;
};
/** Name is the only field a student can change without a verification round-trip. */
const updateProfile = async (userId, payload) => {
    await getUserOrThrow(userId);
    return prisma_1.default.user.update({
        where: { id: userId },
        data: { name: payload.name.trim() },
        select: PROFILE_SELECT,
    });
};
const requestEmailChange = async (userId, payload) => {
    const user = await getUserOrThrow(userId);
    await assertPassword(user.passwordHash, payload.currentPassword);
    const newEmail = payload.newEmail.trim().toLowerCase();
    if (newEmail === user.email.toLowerCase()) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This is already your current email address");
    }
    const taken = await prisma_1.default.user.findUnique({ where: { email: newEmail } });
    if (taken) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this email already exists");
    }
    // The code goes to the NEW address — that is what proves the student owns it.
    return (0, otp_1.issueOtp)({
        userId,
        purpose: enums_1.OtpPurpose.email_change,
        newEmail,
        deliverToEmail: newEmail,
        userName: user.name,
        purposeLabel: "confirm this address as your new Smart Library account email",
    });
};
const verifyEmailChange = async (userId, payload) => {
    const user = await getUserOrThrow(userId);
    const record = await (0, otp_1.consumeOtp)(userId, enums_1.OtpPurpose.email_change, payload.code);
    if (!record.newEmail) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This verification request is incomplete. Start again.");
    }
    // Re-check: another account may have claimed the address while the code sat unused.
    const taken = await prisma_1.default.user.findFirst({
        where: { email: record.newEmail, NOT: { id: userId } },
    });
    if (taken) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this email already exists");
    }
    const updated = await prisma_1.default.user.update({
        where: { id: userId },
        data: { email: record.newEmail },
        select: PROFILE_SELECT,
    });
    return { user: updated, previousEmail: user.email };
};
const requestPasswordChange = async (userId, payload) => {
    const user = await getUserOrThrow(userId);
    await assertPassword(user.passwordHash, payload.currentPassword);
    // The code goes to the CURRENT address, so a stolen session cannot change
    // the password without also holding the mailbox.
    return (0, otp_1.issueOtp)({
        userId,
        purpose: enums_1.OtpPurpose.password_change,
        deliverToEmail: user.email,
        userName: user.name,
        purposeLabel: "confirm the password change on your Smart Library account",
    });
};
const verifyPasswordChange = async (userId, payload) => {
    const user = await getUserOrThrow(userId);
    await assertPassword(user.passwordHash, payload.currentPassword);
    await (0, otp_1.consumeOtp)(userId, enums_1.OtpPurpose.password_change, payload.code);
    const isSame = await bcryptjs_1.default.compare(payload.newPassword, user.passwordHash);
    if (isSame) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "The new password must differ from the current one");
    }
    const passwordHash = await bcryptjs_1.default.hash(payload.newPassword, envVars_1.envVars.BCRYPT_SALT_ROUNDS);
    await prisma_1.default.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: "Password updated successfully" };
};
/**
 * Full fine history for one student, split by ledger. Unlike
 * getUserUnpaidFinesSummary this keeps settled and waived rows too, because the
 * dashboard shows a statement, not just what is owed.
 */
const getMyFines = async (userId) => {
    const [policy, privileges] = await Promise.all([
        setting_service_1.SettingService.getBookingPolicyConfig(),
        (0, privileges_1.getUserPrivileges)(userId),
    ]);
    const [bookings, loans] = await Promise.all([
        prisma_1.default.booking.findMany({
            where: { userId, fineAmount: { gt: 0 }, NOT: { fineStatus: enums_1.FineStatus.none } },
            select: {
                id: true,
                fineAmount: true,
                fineStatus: true,
                cancelReason: true,
                cancelledAt: true,
                bookedAt: true,
                finePaidAt: true,
                paymentMethod: true,
                chalanNumber: true,
                status: true,
                schedule: { select: { date: true, slot: true } },
                seat: { select: { seatNumber: true, zone: { select: { name: true } } } },
            },
            orderBy: { bookedAt: "desc" },
        }),
        prisma_1.default.bookLoan.findMany({
            where: { userId, fineAmount: { gt: 0 }, NOT: { fineStatus: enums_1.FineStatus.none } },
            select: {
                id: true,
                fineAmount: true,
                fineStatus: true,
                dueDate: true,
                returnDate: true,
                finePaidAt: true,
                paymentMethod: true,
                chalanNumber: true,
                book: { select: { title: true, author: true } },
            },
            orderBy: { dueDate: "desc" },
        }),
    ]);
    const seatFines = bookings.map((b) => {
        const seatLabel = b.seat
            ? `Seat ${b.seat.seatNumber}${b.seat.zone ? ` · ${b.seat.zone.name}` : ""}`
            : "Seat reservation";
        const slotLabel = b.schedule
            ? ` · ${new Date(b.schedule.date).toISOString().slice(0, 10)} ${b.schedule.slot}`
            : "";
        return {
            id: b.id,
            source: "booking",
            amount: b.fineAmount,
            status: b.fineStatus,
            reason: b.cancelReason ?? (b.status === "no_show" ? "Marked as no-show" : null),
            subject: `${seatLabel}${slotLabel}`,
            incurredAt: b.cancelledAt ?? b.bookedAt,
            paidAt: b.finePaidAt,
            paymentMethod: b.paymentMethod,
            chalanNumber: b.chalanNumber,
        };
    });
    const loanFines = loans.map((l) => ({
        id: l.id,
        source: "loan",
        amount: l.fineAmount,
        status: l.fineStatus,
        reason: l.returnDate
            ? `Returned late (due ${new Date(l.dueDate).toISOString().slice(0, 10)})`
            : `Overdue since ${new Date(l.dueDate).toISOString().slice(0, 10)}`,
        subject: `${l.book.title} — ${l.book.author}`,
        incurredAt: l.dueDate,
        paidAt: l.finePaidAt,
        paymentMethod: l.paymentMethod,
        chalanNumber: l.chalanNumber,
    }));
    const sumUnpaid = (entries) => roundBDT(entries
        .filter((e) => e.status === enums_1.FineStatus.unpaid)
        .reduce((total, e) => total + e.amount, 0));
    const seatUnpaidTotal = sumUnpaid(seatFines);
    const loanUnpaidTotal = sumUnpaid(loanFines);
    const totalUnpaid = roundBDT(seatUnpaidTotal + loanUnpaidTotal);
    return {
        seatFines,
        loanFines,
        summary: {
            seatUnpaidTotal,
            loanUnpaidTotal,
            totalUnpaid,
            maxUnpaidFineLimit: policy.maxUnpaidFineLimit,
            isBookingBlocked: privileges.exemptSeatFines
                ? false
                : totalUnpaid >= policy.maxUnpaidFineLimit,
            remainingBalance: roundBDT(Math.max(0, policy.maxUnpaidFineLimit - totalUnpaid)),
        },
    };
};
/**
 * Admin user directory with role, approval and free-text filters.
 */
const listUsers = async (options) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const where = {};
    if (options.role)
        where.role = options.role;
    if (options.approvalStatus)
        where.approvalStatus = options.approvalStatus;
    if (options.searchTerm?.trim()) {
        const term = options.searchTerm.trim();
        where.OR = [
            { name: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { studentId: { contains: term, mode: "insensitive" } },
            { facultyId: { contains: term, mode: "insensitive" } },
        ];
    }
    const [users, total] = await Promise.all([
        prisma_1.default.user.findMany({
            where,
            select: PROFILE_SELECT,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.user.count({ where }),
    ]);
    return {
        users,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
/**
 * Faculty signups that verified their email and still await a decision.
 */
const getPendingApprovals = async () => {
    return prisma_1.default.user.findMany({
        where: {
            approvalStatus: enums_2.ApprovalStatus.pending,
            emailVerifiedAt: { not: null },
        },
        select: PROFILE_SELECT,
        orderBy: { createdAt: "asc" },
    });
};
const getApprovableUserOrThrow = async (userId) => {
    const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User account not found");
    }
    if (user.approvalStatus !== enums_2.ApprovalStatus.pending) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `This account is already ${user.approvalStatus}. Only a pending account can be decided.`);
    }
    return user;
};
/**
 * Approve a pending account. The account becomes usable immediately.
 */
const approveUser = async (userId, adminId) => {
    const user = await getApprovableUserOrThrow(userId);
    if (!user.emailVerifiedAt) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This applicant has not verified their email address yet.");
    }
    const approved = await prisma_1.default.user.update({
        where: { id: userId },
        data: {
            approvalStatus: enums_2.ApprovalStatus.approved,
            isActive: true,
            approvedById: adminId,
            approvedAt: new Date(),
            rejectionReason: null,
        },
        select: PROFILE_SELECT,
    });
    if (approved.role === enums_2.Role.faculty) {
        await email_service_1.emailService
            .sendFacultyApprovedEmail({ toEmail: approved.email, facultyName: approved.name })
            .catch((err) => console.error("Failed to send faculty approval email:", err));
    }
    return approved;
};
/**
 * Reject a pending account. The reason is shown to the applicant on login.
 */
const rejectUser = async (userId, adminId, payload) => {
    const user = await getApprovableUserOrThrow(userId);
    const rejected = await prisma_1.default.user.update({
        where: { id: userId },
        data: {
            approvalStatus: enums_2.ApprovalStatus.rejected,
            isActive: false,
            approvedById: adminId,
            approvedAt: new Date(),
            rejectionReason: payload.reason,
        },
        select: PROFILE_SELECT,
    });
    if (user.role === enums_2.Role.faculty) {
        await email_service_1.emailService
            .sendFacultyRejectedEmail({
            toEmail: rejected.email,
            facultyName: rejected.name,
            reason: payload.reason,
        })
            .catch((err) => console.error("Failed to send faculty rejection email:", err));
    }
    return rejected;
};
exports.UserService = {
    getProfile,
    updateProfile,
    requestEmailChange,
    verifyEmailChange,
    requestPasswordChange,
    verifyPasswordChange,
    getMyFines,
    listUsers,
    getPendingApprovals,
    approveUser,
    rejectUser,
};
