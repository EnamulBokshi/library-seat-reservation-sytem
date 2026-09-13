"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeOtp = exports.issueOtp = exports.generateOtpCode = exports.OTP_RESEND_COOLDOWN_SECONDS = exports.OTP_MAX_ATTEMPTS = exports.OTP_TTL_MINUTES = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("./prisma"));
const AppError_1 = __importDefault(require("../helpers/AppError"));
const envVars_1 = require("../config/envVars");
const email_service_1 = require("../services/email.service");
/**
 * Single-use email verification codes. Shared by profile changes (email /
 * password) and by registration, so every flow burns codes the same way.
 */
/** How long a verification code stays valid. */
exports.OTP_TTL_MINUTES = 10;
/** Wrong-code submissions allowed before the code is burned. */
exports.OTP_MAX_ATTEMPTS = 5;
/** Shortest gap between two code requests for the same purpose. */
exports.OTP_RESEND_COOLDOWN_SECONDS = 60;
/**
 * Six-digit code from a cryptographic source, so codes are not guessable from
 * timing or sequence the way Math.random() values are.
 */
const generateOtpCode = () => String(crypto_1.default.randomInt(0, 1_000_000)).padStart(6, "0");
exports.generateOtpCode = generateOtpCode;
/**
 * Issue a fresh OTP for one purpose. Any earlier unconsumed code for the same
 * purpose is deleted first, so only the newest code in the user's inbox works.
 */
const issueOtp = async (params) => {
    if (params.enforceCooldown) {
        const previous = await prisma_1.default.otpVerification.findFirst({
            where: { userId: params.userId, purpose: params.purpose },
            orderBy: { createdAt: "desc" },
        });
        if (previous) {
            const elapsedSeconds = (Date.now() - previous.createdAt.getTime()) / 1000;
            if (elapsedSeconds < exports.OTP_RESEND_COOLDOWN_SECONDS) {
                throw new AppError_1.default(http_status_1.default.TOO_MANY_REQUESTS, `Please wait ${Math.ceil(exports.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds)} second(s) before requesting another code.`);
            }
        }
    }
    await prisma_1.default.otpVerification.deleteMany({
        where: { userId: params.userId, purpose: params.purpose },
    });
    const code = (0, exports.generateOtpCode)();
    const codeHash = await bcryptjs_1.default.hash(code, envVars_1.envVars.BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + exports.OTP_TTL_MINUTES * 60 * 1000);
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
        expiresInMinutes: exports.OTP_TTL_MINUTES,
    });
    return { expiresAt, expiresInMinutes: exports.OTP_TTL_MINUTES, sentTo: params.deliverToEmail };
};
exports.issueOtp = issueOtp;
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
        if (attempts >= exports.OTP_MAX_ATTEMPTS) {
            await prisma_1.default.otpVerification.delete({ where: { id: record.id } });
            throw new AppError_1.default(http_status_1.default.TOO_MANY_REQUESTS, "Too many incorrect attempts. Request a new verification code.");
        }
        await prisma_1.default.otpVerification.update({ where: { id: record.id }, data: { attempts } });
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Incorrect verification code. ${exports.OTP_MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
    }
    await prisma_1.default.otpVerification.delete({ where: { id: record.id } });
    return record;
};
exports.consumeOtp = consumeOtp;
