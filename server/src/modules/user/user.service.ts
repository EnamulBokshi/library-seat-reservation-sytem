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
import { ApprovalSortField, IApprovalListOptions, IListUsersOptions, IRejectUserPayload } from "./user.interface";
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

/**
 * Admin user directory with role, approval and free-text filters.
 */
const listUsers = async (options: IListUsersOptions) => {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const where: Record<string, unknown> = {};
    if (options.role) where.role = options.role;
    if (options.approvalStatus) where.approvalStatus = options.approvalStatus;
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
        prisma.user.findMany({
            where,
            select: PROFILE_SELECT,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.user.count({ where }),
    ]);

    return {
        users,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

export const UserService = {
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
