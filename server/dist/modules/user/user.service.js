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
const USER_SORT_FIELDS = ["createdAt", "name", "email", "role", "isActive"];
/**
 * Admin user directory with role, active status, approval and free-text filters,
 * sorting, pagination, and real-time user statistics.
 */
const listUsers = async (options) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 10));
    const where = {};
    if (options.role)
        where.role = options.role;
    if (options.isActive !== undefined)
        where.isActive = options.isActive;
    if (options.approvalStatus)
        where.approvalStatus = options.approvalStatus;
    if (options.searchTerm?.trim()) {
        const term = options.searchTerm.trim();
        where.OR = [
            { name: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { studentId: { contains: term, mode: "insensitive" } },
            { facultyId: { contains: term, mode: "insensitive" } },
            { department: { contains: term, mode: "insensitive" } },
        ];
    }
    const sortBy = options.sortBy && USER_SORT_FIELDS.includes(options.sortBy)
        ? options.sortBy
        : "createdAt";
    const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";
    const [users, total, statsGroup] = await Promise.all([
        prisma_1.default.user.findMany({
            where,
            select: PROFILE_SELECT,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.user.count({ where }),
        prisma_1.default.user.groupBy({
            by: ["role", "isActive"],
            _count: { _all: true },
        }),
    ]);
    let totalUsers = 0;
    let activeUsers = 0;
    let suspendedUsers = 0;
    let superAdmins = 0;
    let admins = 0;
    let librarians = 0;
    let faculty = 0;
    let students = 0;
    for (const row of statsGroup) {
        const count = row._count._all;
        totalUsers += count;
        if (row.isActive) {
            activeUsers += count;
        }
        else {
            suspendedUsers += count;
        }
        if (row.role === enums_2.Role.super_admin)
            superAdmins += count;
        else if (row.role === enums_2.Role.admin)
            admins += count;
        else if (row.role === enums_2.Role.librarian)
            librarians += count;
        else if (row.role === enums_2.Role.faculty)
            faculty += count;
        else if (row.role === enums_2.Role.student)
            students += count;
    }
    return {
        users,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        stats: {
            totalUsers,
            activeUsers,
            suspendedUsers,
            superAdmins,
            admins,
            librarians,
            faculty,
            students,
        },
    };
};
const APPROVAL_SORT_FIELDS = [
    "createdAt",
    "emailVerifiedAt",
    "name",
    "email",
    "department",
];
const APPROVAL_STATUS_VALUES = Object.values(enums_2.ApprovalStatus);
/**
 * Account requests awaiting (or already given) a decision, filtered, sorted and
 * paged. Defaults to pending faculty signups that have verified their email —
 * the queue an admin works through — but the same query backs the decided
 * history once a status filter is passed.
 */
const getPendingApprovals = async (options = {}) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 12));
    const approvalStatus = options.approvalStatus && APPROVAL_STATUS_VALUES.includes(options.approvalStatus)
        ? options.approvalStatus
        : enums_2.ApprovalStatus.pending;
    const sortBy = options.sortBy && APPROVAL_SORT_FIELDS.includes(options.sortBy)
        ? options.sortBy
        : "createdAt";
    const sortOrder = options.sortOrder === "desc" ? "desc" : "asc";
    // An unverified applicant cannot be approved, so the pending queue hides
    // them by default. Any other status lists every row.
    const emailVerifiedOnly = options.emailVerifiedOnly ?? approvalStatus === enums_2.ApprovalStatus.pending;
    const where = {
        approvalStatus,
        // Staff accounts are created by admins and never sit in this queue.
        role: options.role
            ? options.role
            : { in: [enums_2.Role.faculty, enums_2.Role.student] },
        ...(emailVerifiedOnly ? { emailVerifiedAt: { not: null } } : {}),
    };
    if (options.searchTerm?.trim()) {
        const term = options.searchTerm.trim();
        where.OR = [
            { name: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { facultyId: { contains: term, mode: "insensitive" } },
            { studentId: { contains: term, mode: "insensitive" } },
            { department: { contains: term, mode: "insensitive" } },
            { designation: { contains: term, mode: "insensitive" } },
        ];
    }
    const [requests, total, statusCounts] = await Promise.all([
        prisma_1.default.user.findMany({
            where,
            select: PROFILE_SELECT,
            // Nulls sort last on a nullable column so decided rows never lead.
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.default.user.count({ where }),
        prisma_1.default.user.groupBy({
            by: ["approvalStatus"],
            where: { role: { in: [enums_2.Role.faculty, enums_2.Role.student] } },
            _count: { _all: true },
        }),
    ]);
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const row of statusCounts) {
        counts[row.approvalStatus] = row._count._all;
    }
    return {
        requests,
        counts,
        meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
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
/**
 * Admin creates a user directly.
 * Enforces rule: Only a super_admin can create another super_admin.
 */
const createUser = async (creator, payload) => {
    if (payload.role === enums_2.Role.super_admin && creator.role !== enums_2.Role.super_admin) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Only a Super Admin can create another Super Admin account");
    }
    const email = payload.email.trim().toLowerCase();
    const existingEmail = await prisma_1.default.user.findUnique({ where: { email } });
    if (existingEmail) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this email address already exists");
    }
    if (payload.studentId?.trim()) {
        const existingStudent = await prisma_1.default.user.findUnique({
            where: { studentId: payload.studentId.trim() },
        });
        if (existingStudent) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this Student ID already exists");
        }
    }
    if (payload.facultyId?.trim()) {
        const existingFaculty = await prisma_1.default.user.findUnique({
            where: { facultyId: payload.facultyId.trim() },
        });
        if (existingFaculty) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this Faculty ID already exists");
        }
    }
    const passwordHash = await bcryptjs_1.default.hash(payload.password, 12);
    const user = await prisma_1.default.user.create({
        data: {
            name: payload.name.trim(),
            email,
            passwordHash,
            role: payload.role,
            studentId: payload.studentId?.trim() || null,
            facultyId: payload.facultyId?.trim() || null,
            department: payload.department?.trim() || null,
            designation: payload.designation?.trim() || null,
            isActive: payload.isActive ?? true,
            emailVerifiedAt: new Date(),
            approvalStatus: enums_2.ApprovalStatus.approved,
            approvedById: creator.userId,
            approvedAt: new Date(),
        },
        select: PROFILE_SELECT,
    });
    return user;
};
/**
 * Admin updates an existing user profile, role, or active status.
 * Enforces rules:
 * - Only super_admin can modify a super_admin account.
 * - Only super_admin can promote a user to super_admin.
 * - Prevents self-deactivation and self-role demotion.
 */
const updateUser = async (targetUserId, updater, payload) => {
    const targetUser = await getUserOrThrow(targetUserId);
    if (targetUser.role === enums_2.Role.super_admin && updater.role !== enums_2.Role.super_admin) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Only a Super Admin can modify a Super Admin account");
    }
    if (payload.role === enums_2.Role.super_admin &&
        targetUser.role !== enums_2.Role.super_admin &&
        updater.role !== enums_2.Role.super_admin) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Only a Super Admin can assign the Super Admin role");
    }
    if (targetUserId === updater.userId) {
        if (payload.isActive === false) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You cannot deactivate your own account");
        }
        if (payload.role && payload.role !== updater.role) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You cannot modify your own role");
        }
    }
    if (payload.studentId && payload.studentId.trim() !== targetUser.studentId) {
        const existingStudent = await prisma_1.default.user.findUnique({
            where: { studentId: payload.studentId.trim() },
        });
        if (existingStudent && existingStudent.id !== targetUserId) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this Student ID already exists");
        }
    }
    if (payload.facultyId && payload.facultyId.trim() !== targetUser.facultyId) {
        const existingFaculty = await prisma_1.default.user.findUnique({
            where: { facultyId: payload.facultyId.trim() },
        });
        if (existingFaculty && existingFaculty.id !== targetUserId) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this Faculty ID already exists");
        }
    }
    const data = {};
    if (payload.name !== undefined)
        data.name = payload.name.trim();
    if (payload.role !== undefined)
        data.role = payload.role;
    if (payload.isActive !== undefined)
        data.isActive = payload.isActive;
    if (payload.studentId !== undefined) {
        data.studentId = payload.studentId ? payload.studentId.trim() : null;
    }
    if (payload.facultyId !== undefined) {
        data.facultyId = payload.facultyId ? payload.facultyId.trim() : null;
    }
    if (payload.department !== undefined) {
        data.department = payload.department ? payload.department.trim() : null;
    }
    if (payload.designation !== undefined) {
        data.designation = payload.designation ? payload.designation.trim() : null;
    }
    if (payload.password) {
        data.passwordHash = await bcryptjs_1.default.hash(payload.password, 12);
    }
    const updated = await prisma_1.default.user.update({
        where: { id: targetUserId },
        data,
        select: PROFILE_SELECT,
    });
    return updated;
};
/**
 * Admin deletes a user account.
 * Enforces rules:
 * - Self-deletion is strictly prohibited.
 * - Only super_admin can delete a super_admin account.
 * - Rejects deletion if the user has unreturned active book loans.
 */
const deleteUser = async (targetUserId, deleter) => {
    if (targetUserId === deleter.userId) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Self-deletion is strictly prohibited. You cannot delete your own account.");
    }
    const targetUser = await getUserOrThrow(targetUserId);
    if (targetUser.role === enums_2.Role.super_admin && deleter.role !== enums_2.Role.super_admin) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Only a Super Admin can delete a Super Admin account.");
    }
    const activeLoans = await prisma_1.default.bookLoan.count({
        where: {
            userId: targetUserId,
            status: { in: ["issued", "overdue"] },
        },
    });
    if (activeLoans > 0) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Cannot delete user with ${activeLoans} active unreturned book loan(s). Please have the books returned or settled first.`);
    }
    await prisma_1.default.user.delete({
        where: { id: targetUserId },
    });
    return {
        id: targetUserId,
        name: targetUser.name,
        email: targetUser.email,
    };
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
    createUser,
    updateUser,
    deleteUser,
    getPendingApprovals,
    approveUser,
    rejectUser,
};
