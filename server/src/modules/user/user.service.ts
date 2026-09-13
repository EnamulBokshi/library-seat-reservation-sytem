import bcrypt from "bcryptjs";
import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { envVars } from "../../config/envVars";
import { FineStatus, OtpPurpose } from "../../generated/enums";
import { emailService } from "../../services/email.service";
import { consumeOtp, issueOtp } from "../../lib/otp";
import { getUserPrivileges } from "../../lib/privileges";
import { Prisma } from "../../generated/client";
import { ApprovalStatus, Role } from "../../generated/enums";
import {
    ApprovalSortField,
    IApprovalListOptions,
    IListUsersOptions,
    IRejectUserPayload,
    ICreateUserPayload,
    IAdminUpdateUserPayload,
    UserSortField,
} from "./user.interface";
import { SettingService } from "../../modules/setting/setting.service";
import {
    IFineEntry,
    IMyFinesResult,
    IRequestEmailChangePayload,
    IRequestPasswordChangePayload,
    IUpdateProfilePayload,
    IVerifyEmailChangePayload,
    IVerifyPasswordChangePayload,
} from "./user.interface";

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
} as const;

const roundBDT = (amount: number): number => Math.round(amount * 100) / 100;

const assertPassword = async (passwordHash: string, candidate: string) => {
    const isValid = await bcrypt.compare(candidate, passwordHash);
    if (!isValid) {
        throw new AppError(status.UNAUTHORIZED, "Current password is incorrect");
    }
};

const getUserOrThrow = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User account not found");
    }
    return user;
};

const getProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User account not found");
    }
    return user;
};

/** Name is the only field a student can change without a verification round-trip. */
const updateProfile = async (userId: string, payload: IUpdateProfilePayload) => {
    await getUserOrThrow(userId);
    return prisma.user.update({
        where: { id: userId },
        data: { name: payload.name.trim() },
        select: PROFILE_SELECT,
    });
};

const requestEmailChange = async (userId: string, payload: IRequestEmailChangePayload) => {
    const user = await getUserOrThrow(userId);
    await assertPassword(user.passwordHash, payload.currentPassword);

    const newEmail = payload.newEmail.trim().toLowerCase();
    if (newEmail === user.email.toLowerCase()) {
        throw new AppError(status.BAD_REQUEST, "This is already your current email address");
    }

    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) {
        throw new AppError(status.CONFLICT, "A user with this email already exists");
    }

    // The code goes to the NEW address — that is what proves the student owns it.
    return issueOtp({
        userId,
        purpose: OtpPurpose.email_change,
        newEmail,
        deliverToEmail: newEmail,
        userName: user.name,
        purposeLabel: "confirm this address as your new Smart Library account email",
    });
};

const verifyEmailChange = async (userId: string, payload: IVerifyEmailChangePayload) => {
    const user = await getUserOrThrow(userId);
    const record = await consumeOtp(userId, OtpPurpose.email_change, payload.code);

    if (!record.newEmail) {
        throw new AppError(status.BAD_REQUEST, "This verification request is incomplete. Start again.");
    }

    // Re-check: another account may have claimed the address while the code sat unused.
    const taken = await prisma.user.findFirst({
        where: { email: record.newEmail, NOT: { id: userId } },
    });
    if (taken) {
        throw new AppError(status.CONFLICT, "A user with this email already exists");
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { email: record.newEmail },
        select: PROFILE_SELECT,
    });

    return { user: updated, previousEmail: user.email };
};

const requestPasswordChange = async (userId: string, payload: IRequestPasswordChangePayload) => {
    const user = await getUserOrThrow(userId);
    await assertPassword(user.passwordHash, payload.currentPassword);

    // The code goes to the CURRENT address, so a stolen session cannot change
    // the password without also holding the mailbox.
    return issueOtp({
        userId,
        purpose: OtpPurpose.password_change,
        deliverToEmail: user.email,
        userName: user.name,
        purposeLabel: "confirm the password change on your Smart Library account",
    });
};

const verifyPasswordChange = async (userId: string, payload: IVerifyPasswordChangePayload) => {
    const user = await getUserOrThrow(userId);
    await assertPassword(user.passwordHash, payload.currentPassword);
    await consumeOtp(userId, OtpPurpose.password_change, payload.code);

    const isSame = await bcrypt.compare(payload.newPassword, user.passwordHash);
    if (isSame) {
        throw new AppError(status.BAD_REQUEST, "The new password must differ from the current one");
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, envVars.BCRYPT_SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: "Password updated successfully" };
};

/**
 * Full fine history for one student, split by ledger. Unlike
 * getUserUnpaidFinesSummary this keeps settled and waived rows too, because the
 * dashboard shows a statement, not just what is owed.
 */
const getMyFines = async (userId: string): Promise<IMyFinesResult> => {
    const [policy, privileges] = await Promise.all([
        SettingService.getBookingPolicyConfig(),
        getUserPrivileges(userId),
    ]);

    const [bookings, loans] = await Promise.all([
        prisma.booking.findMany({
            where: { userId, fineAmount: { gt: 0 }, NOT: { fineStatus: FineStatus.none } },
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
        prisma.bookLoan.findMany({
            where: { userId, fineAmount: { gt: 0 }, NOT: { fineStatus: FineStatus.none } },
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

    const seatFines: IFineEntry[] = bookings.map((b) => {
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

    const loanFines: IFineEntry[] = loans.map((l) => ({
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

    const sumUnpaid = (entries: IFineEntry[]) =>
        roundBDT(
            entries
                .filter((e) => e.status === FineStatus.unpaid)
                .reduce((total, e) => total + e.amount, 0)
        );

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

const USER_SORT_FIELDS: UserSortField[] = ["createdAt", "name", "email", "role", "isActive"];

/**
 * Admin user directory with role, active status, approval and free-text filters,
 * sorting, pagination, and real-time user statistics.
 */
const listUsers = async (options: IListUsersOptions) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 10));

    const where: Prisma.UserWhereInput = {};
    if (options.role) where.role = options.role as Role;
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.approvalStatus) where.approvalStatus = options.approvalStatus as ApprovalStatus;

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
        prisma.user.findMany({
            where,
            select: PROFILE_SELECT,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.user.count({ where }),
        prisma.user.groupBy({
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
        } else {
            suspendedUsers += count;
        }
        if (row.role === Role.super_admin) superAdmins += count;
        else if (row.role === Role.admin) admins += count;
        else if (row.role === Role.librarian) librarians += count;
        else if (row.role === Role.faculty) faculty += count;
        else if (row.role === Role.student) students += count;
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

const APPROVAL_SORT_FIELDS: ApprovalSortField[] = [
    "createdAt",
    "emailVerifiedAt",
    "name",
    "email",
    "department",
];

const APPROVAL_STATUS_VALUES = Object.values(ApprovalStatus) as string[];

/**
 * Account requests awaiting (or already given) a decision, filtered, sorted and
 * paged. Defaults to pending faculty signups that have verified their email —
 * the queue an admin works through — but the same query backs the decided
 * history once a status filter is passed.
 */
const getPendingApprovals = async (options: IApprovalListOptions = {}) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 12));

    const approvalStatus =
        options.approvalStatus && APPROVAL_STATUS_VALUES.includes(options.approvalStatus)
            ? (options.approvalStatus as ApprovalStatus)
            : ApprovalStatus.pending;

    const sortBy: ApprovalSortField =
        options.sortBy && APPROVAL_SORT_FIELDS.includes(options.sortBy)
            ? options.sortBy
            : "createdAt";
    const sortOrder = options.sortOrder === "desc" ? "desc" : "asc";

    // An unverified applicant cannot be approved, so the pending queue hides
    // them by default. Any other status lists every row.
    const emailVerifiedOnly =
        options.emailVerifiedOnly ?? approvalStatus === ApprovalStatus.pending;

    const where: Prisma.UserWhereInput = {
        approvalStatus,
        // Staff accounts are created by admins and never sit in this queue.
        role: options.role
            ? (options.role as Role)
            : { in: [Role.faculty, Role.student] },
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
        prisma.user.findMany({
            where,
            select: PROFILE_SELECT,
            // Nulls sort last on a nullable column so decided rows never lead.
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.user.count({ where }),
        prisma.user.groupBy({
            by: ["approvalStatus"],
            where: { role: { in: [Role.faculty, Role.student] } },
            _count: { _all: true },
        }),
    ]);

    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const row of statusCounts) {
        counts[row.approvalStatus as keyof typeof counts] = row._count._all;
    }

    return {
        requests,
        counts,
        meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
};

const getApprovableUserOrThrow = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User account not found");
    }

    if (user.approvalStatus !== ApprovalStatus.pending) {
        throw new AppError(
            status.BAD_REQUEST,
            `This account is already ${user.approvalStatus}. Only a pending account can be decided.`
        );
    }

    return user;
};

/**
 * Approve a pending account. The account becomes usable immediately.
 */
const approveUser = async (userId: string, adminId: string) => {
    const user = await getApprovableUserOrThrow(userId);

    if (!user.emailVerifiedAt) {
        throw new AppError(
            status.BAD_REQUEST,
            "This applicant has not verified their email address yet."
        );
    }

    const approved = await prisma.user.update({
        where: { id: userId },
        data: {
            approvalStatus: ApprovalStatus.approved,
            isActive: true,
            approvedById: adminId,
            approvedAt: new Date(),
            rejectionReason: null,
        },
        select: PROFILE_SELECT,
    });

    if (approved.role === Role.faculty) {
        await emailService
            .sendFacultyApprovedEmail({ toEmail: approved.email, facultyName: approved.name })
            .catch((err) => console.error("Failed to send faculty approval email:", err));
    }

    return approved;
};

/**
 * Reject a pending account. The reason is shown to the applicant on login.
 */
const rejectUser = async (userId: string, adminId: string, payload: IRejectUserPayload) => {
    const user = await getApprovableUserOrThrow(userId);

    const rejected = await prisma.user.update({
        where: { id: userId },
        data: {
            approvalStatus: ApprovalStatus.rejected,
            isActive: false,
            approvedById: adminId,
            approvedAt: new Date(),
            rejectionReason: payload.reason,
        },
        select: PROFILE_SELECT,
    });

    if (user.role === Role.faculty) {
        await emailService
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
const createUser = async (
    creator: { userId: string; role: Role },
    payload: ICreateUserPayload
) => {
    if (payload.role === Role.super_admin && creator.role !== Role.super_admin) {
        throw new AppError(
            status.FORBIDDEN,
            "Only a Super Admin can create another Super Admin account"
        );
    }

    const email = payload.email.trim().toLowerCase();
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
        throw new AppError(status.CONFLICT, "A user with this email address already exists");
    }

    if (payload.studentId?.trim()) {
        const existingStudent = await prisma.user.findUnique({
            where: { studentId: payload.studentId.trim() },
        });
        if (existingStudent) {
            throw new AppError(status.CONFLICT, "A user with this Student ID already exists");
        }
    }

    if (payload.facultyId?.trim()) {
        const existingFaculty = await prisma.user.findUnique({
            where: { facultyId: payload.facultyId.trim() },
        });
        if (existingFaculty) {
            throw new AppError(status.CONFLICT, "A user with this Faculty ID already exists");
        }
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await prisma.user.create({
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
            approvalStatus: ApprovalStatus.approved,
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
const updateUser = async (
    targetUserId: string,
    updater: { userId: string; role: Role },
    payload: IAdminUpdateUserPayload
) => {
    const targetUser = await getUserOrThrow(targetUserId);

    if (targetUser.role === Role.super_admin && updater.role !== Role.super_admin) {
        throw new AppError(
            status.FORBIDDEN,
            "Only a Super Admin can modify a Super Admin account"
        );
    }

    if (
        payload.role === Role.super_admin &&
        targetUser.role !== Role.super_admin &&
        updater.role !== Role.super_admin
    ) {
        throw new AppError(
            status.FORBIDDEN,
            "Only a Super Admin can assign the Super Admin role"
        );
    }

    if (targetUserId === updater.userId) {
        if (payload.isActive === false) {
            throw new AppError(status.BAD_REQUEST, "You cannot deactivate your own account");
        }
        if (payload.role && payload.role !== updater.role) {
            throw new AppError(status.BAD_REQUEST, "You cannot modify your own role");
        }
    }

    if (payload.studentId && payload.studentId.trim() !== targetUser.studentId) {
        const existingStudent = await prisma.user.findUnique({
            where: { studentId: payload.studentId.trim() },
        });
        if (existingStudent && existingStudent.id !== targetUserId) {
            throw new AppError(status.CONFLICT, "A user with this Student ID already exists");
        }
    }

    if (payload.facultyId && payload.facultyId.trim() !== targetUser.facultyId) {
        const existingFaculty = await prisma.user.findUnique({
            where: { facultyId: payload.facultyId.trim() },
        });
        if (existingFaculty && existingFaculty.id !== targetUserId) {
            throw new AppError(status.CONFLICT, "A user with this Faculty ID already exists");
        }
    }

    const data: Prisma.UserUpdateInput = {};
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.role !== undefined) data.role = payload.role;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;
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
        data.passwordHash = await bcrypt.hash(payload.password, 12);
    }

    const updated = await prisma.user.update({
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
const deleteUser = async (
    targetUserId: string,
    deleter: { userId: string; role: Role }
) => {
    if (targetUserId === deleter.userId) {
        throw new AppError(
            status.BAD_REQUEST,
            "Self-deletion is strictly prohibited. You cannot delete your own account."
        );
    }

    const targetUser = await getUserOrThrow(targetUserId);

    if (targetUser.role === Role.super_admin && deleter.role !== Role.super_admin) {
        throw new AppError(
            status.FORBIDDEN,
            "Only a Super Admin can delete a Super Admin account."
        );
    }

    const activeLoans = await prisma.bookLoan.count({
        where: {
            userId: targetUserId,
            status: { in: ["issued", "overdue"] },
        },
    });

    if (activeLoans > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            `Cannot delete user with ${activeLoans} active unreturned book loan(s). Please have the books returned or settled first.`
        );
    }

    await prisma.user.delete({
        where: { id: targetUserId },
    });

    return {
        id: targetUserId,
        name: targetUser.name,
        email: targetUser.email,
    };
};

export const UserService = {
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
