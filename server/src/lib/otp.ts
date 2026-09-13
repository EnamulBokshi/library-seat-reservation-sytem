import bcrypt from "bcryptjs";
import crypto from "crypto";
import status from "http-status";
import prisma from "./prisma";
import AppError from "../helpers/AppError";
import { envVars } from "../config/envVars";
import { OtpPurpose } from "../generated/enums";
import { emailService } from "../services/email.service";

/**
 * Single-use email verification codes. Shared by profile changes (email /
 * password) and by registration, so every flow burns codes the same way.
 */

/** How long a verification code stays valid. */
export const OTP_TTL_MINUTES = 10;
/** Wrong-code submissions allowed before the code is burned. */
export const OTP_MAX_ATTEMPTS = 5;
/** Shortest gap between two code requests for the same purpose. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Six-digit code from a cryptographic source, so codes are not guessable from
 * timing or sequence the way Math.random() values are.
 */
export const generateOtpCode = (): string =>
    String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

/**
 * Issue a fresh OTP for one purpose. Any earlier unconsumed code for the same
 * purpose is deleted first, so only the newest code in the user's inbox works.
 */
export const issueOtp = async (params: {
    userId: string;
    purpose: OtpPurpose;
    newEmail?: string;
    deliverToEmail: string;
    userName: string;
    purposeLabel: string;
    /** Reject a repeat request that arrives inside the cooldown window. */
    enforceCooldown?: boolean;
}) => {
    if (params.enforceCooldown) {
        const previous = await prisma.otpVerification.findFirst({
            where: { userId: params.userId, purpose: params.purpose },
            orderBy: { createdAt: "desc" },
        });

        if (previous) {
            const elapsedSeconds = (Date.now() - previous.createdAt.getTime()) / 1000;
            if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
                throw new AppError(
                    status.TOO_MANY_REQUESTS,
                    `Please wait ${Math.ceil(
                        OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
                    )} second(s) before requesting another code.`
                );
            }
        }
    }

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
export const consumeOtp = async (userId: string, purpose: OtpPurpose, code: string) => {
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
