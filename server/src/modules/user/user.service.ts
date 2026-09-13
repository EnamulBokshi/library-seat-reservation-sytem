import bcrypt from "bcryptjs";
import crypto from "crypto";
import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { envVars } from "../../config/envVars";
import { FineStatus, OtpPurpose } from "../../generated/enums";
import { emailService } from "../../services/email.service";
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

/** How long a verification code stays valid. */
const OTP_TTL_MINUTES = 10;
/** Wrong-code submissions allowed before the code is burned. */
const OTP_MAX_ATTEMPTS = 5;

const PROFILE_SELECT = {
    id: true,
    name: true,
    email: true,
    studentId: true,
    role: true,
    isActive: true,
    createdAt: true,
} as const;

const roundBDT = (amount: number): number => Math.round(amount * 100) / 100;

/**
 * Six-digit code from a cryptographic source, so codes are not guessable from
 * timing or sequence the way Math.random() values are.
 */
const generateOtpCode = (): string => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

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

/**
 * Issue a fresh OTP for one purpose. Any earlier unconsumed code for the same
 * purpose is deleted first, so only the newest code in the user's inbox works.
 */
const issueOtp = async (params: {
    userId: string;
    purpose: OtpPurpose;
    newEmail?: string;
    deliverToEmail: string;
    userName: string;
    purposeLabel: string;
}) => {
    await prisma.otpVerification.deleteMany({
        where: { userId: params.userId, purpose: params.purpose },
    });

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, envVars.BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await prisma.otpVerification.create({
        data: {
            userId: params.userId,
            purpose: params.purpose,
            codeHash,
            newEmail: params.newEmail ?? null,
            expiresAt,
        },
    });

    await emailService.sendProfileOtpEmail({
        toEmail: params.deliverToEmail,
        studentName: params.userName,
        code,
        purposeLabel: params.purposeLabel,
        expiresInMinutes: OTP_TTL_MINUTES,
    });

    return { expiresAt, expiresInMinutes: OTP_TTL_MINUTES, sentTo: params.deliverToEmail };
};

/**
 * Consume an OTP: it must exist, be unexpired, and match. A wrong code counts
 * an attempt and burns the record once the attempt ceiling is reached, so a
 * leaked address cannot be brute-forced through six-digit space.
 */
const consumeOtp = async (userId: string, purpose: OtpPurpose, code: string) => {
    const record = await prisma.otpVerification.findFirst({
        where: { userId, purpose, consumedAt: null },
        orderBy: { createdAt: "desc" },
    });

    if (!record) {
        throw new AppError(status.BAD_REQUEST, "No pending verification code. Request a new one.");
    }

    if (record.expiresAt.getTime() < Date.now()) {
        await prisma.otpVerification.delete({ where: { id: record.id } });
        throw new AppError(status.BAD_REQUEST, "This verification code has expired. Request a new one.");
    }

    const isMatch = await bcrypt.compare(code, record.codeHash);
    if (!isMatch) {
        const attempts = record.attempts + 1;
        if (attempts >= OTP_MAX_ATTEMPTS) {
            await prisma.otpVerification.delete({ where: { id: record.id } });
            throw new AppError(
                status.TOO_MANY_REQUESTS,
                "Too many incorrect attempts. Request a new verification code."
            );
        }
        await prisma.otpVerification.update({ where: { id: record.id }, data: { attempts } });
        throw new AppError(
            status.BAD_REQUEST,
            `Incorrect verification code. ${OTP_MAX_ATTEMPTS - attempts} attempt(s) remaining.`
        );
    }

    await prisma.otpVerification.delete({ where: { id: record.id } });
    return record;
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
    const policy = await SettingService.getBookingPolicyConfig();

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
            isBookingBlocked: totalUnpaid >= policy.maxUnpaidFineLimit,
            remainingBalance: roundBDT(Math.max(0, policy.maxUnpaidFineLimit - totalUnpaid)),
        },
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
};
