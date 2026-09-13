"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const envVars_1 = require("../../config/envVars");
const enums_1 = require("../../generated/enums");
const email_service_1 = require("../../services/email.service");
const setting_service_1 = require("../../modules/setting/setting.service");
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
};
const roundBDT = (amount) => Math.round(amount * 100) / 100;
/**
 * Six-digit code from a cryptographic source, so codes are not guessable from
 * timing or sequence the way Math.random() values are.
 */
const generateOtpCode = () => String(crypto_1.default.randomInt(0, 1_000_000)).padStart(6, "0");
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
/**
 * Issue a fresh OTP for one purpose. Any earlier unconsumed code for the same
 * purpose is deleted first, so only the newest code in the user's inbox works.
 */
const issueOtp = async (params) => {
    await prisma_1.default.otpVerification.deleteMany({
        where: { userId: params.userId, purpose: params.purpose },
    });
    const code = generateOtpCode();
    const codeHash = await bcryptjs_1.default.hash(code, envVars_1.envVars.BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await prisma_1.default.otpVerification.create({
        data: {
            userId: params.userId,
            purpose: params.purpose,
            codeHash,
            newEmail: params.newEmail ?? null,
            expiresAt,
        },
    });
    await email_service_1.emailService.sendProfileOtpEmail({
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
const consumeOtp = async (userId, purpose, code) => {
    const record = await prisma_1.default.otpVerification.findFirst({
        where: { userId, purpose, consumedAt: null },
        orderBy: { createdAt: "desc" },
    });
    if (!record) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "No pending verification code. Request a new one.");
    }
    if (record.expiresAt.getTime() < Date.now()) {
        await prisma_1.default.otpVerification.delete({ where: { id: record.id } });
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This verification code has expired. Request a new one.");
    }
    const isMatch = await bcryptjs_1.default.compare(code, record.codeHash);
    if (!isMatch) {
        const attempts = record.attempts + 1;
        if (attempts >= OTP_MAX_ATTEMPTS) {
            await prisma_1.default.otpVerification.delete({ where: { id: record.id } });
            throw new AppError_1.default(http_status_1.default.TOO_MANY_REQUESTS, "Too many incorrect attempts. Request a new verification code.");
        }
        await prisma_1.default.otpVerification.update({ where: { id: record.id }, data: { attempts } });
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Incorrect verification code. ${OTP_MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
    }
    await prisma_1.default.otpVerification.delete({ where: { id: record.id } });
    return record;
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
    return issueOtp({
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
    const record = await consumeOtp(userId, enums_1.OtpPurpose.email_change, payload.code);
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
    return issueOtp({
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
    await consumeOtp(userId, enums_1.OtpPurpose.password_change, payload.code);
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
    const policy = await setting_service_1.SettingService.getBookingPolicyConfig();
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
            isBookingBlocked: totalUnpaid >= policy.maxUnpaidFineLimit,
            remainingBalance: roundBDT(Math.max(0, policy.maxUnpaidFineLimit - totalUnpaid)),
        },
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
};
