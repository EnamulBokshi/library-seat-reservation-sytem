import bcrypt from "bcryptjs";
import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { envVars } from "../../config/envVars";
import { tokenUtils } from "../../utils/token";
import { jwtUtils } from "../../utils/jwt";
import {
    IRegisterPayload,
    ILoginPayload,
    ITokenPayload,
    IVerifyRegistrationPayload,
    IResendRegistrationOtpPayload,
} from "./auth.interface";
import { ApprovalStatus, OtpPurpose, Role } from "../../generated/enums";
import { consumeOtp, issueOtp } from "../../lib/otp";
import { emailService } from "../../services/email.service";

const REGISTRATION_OTP_PURPOSE_LABEL = "verify your email address and activate your library account";

/** Addresses that review faculty signups and waiver petitions. */
const getLibraryApproverEmails = async (): Promise<string[]> => {
    const approvers = await prisma.user.findMany({
        where: { role: Role.admin, isActive: true },
        select: { email: true },
    });
    return approvers.map((a) => a.email);
};

/** Look up an account by email for the public verification endpoints. */
const getPendingRegistrationUser = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "No account found for this email address");
    }

    if (user.emailVerifiedAt) {
        throw new AppError(status.BAD_REQUEST, "This email address is already verified");
    }

    return user;
};

/**
 * Register a new student or faculty account.
 * Librarians and admins are created by admins, never through this route.
 *
 * Both roles must verify the email address with the code mailed here. A
 * faculty account additionally stays `pending` until an admin approves it.
 */
const register = async (payload: IRegisterPayload) => {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: payload.email },
    });

    if (existingUser) {
        throw new AppError(status.CONFLICT, "A user with this email already exists");
    }

    const requestedRole: Role = payload.role === "faculty" ? Role.faculty : Role.student;

    // Check if facultyId is already taken
    if (requestedRole === Role.faculty && payload.facultyId) {
        const existingFaculty = await prisma.user.findUnique({
            where: { facultyId: payload.facultyId },
        });
        if (existingFaculty) {
            throw new AppError(status.CONFLICT, "This faculty ID is already registered");
        }
    }

    // Check if studentId is already taken
    if (payload.studentId) {
        const existingStudent = await prisma.user.findUnique({
            where: { studentId: payload.studentId },
        });
        if (existingStudent) {
            throw new AppError(status.CONFLICT, "This student ID is already registered");
        }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(payload.password, envVars.BCRYPT_SALT_ROUNDS);

    const isFaculty = requestedRole === Role.faculty;

    // The account is inert until the email code is consumed, and — for faculty —
    // until an admin approves it.
    const user = await prisma.user.create({
        data: {
            name: payload.name,
            email: payload.email,
            studentId: isFaculty ? null : payload.studentId || null,
            passwordHash,
            role: requestedRole,
            isActive: false,
            facultyId: isFaculty ? payload.facultyId || null : null,
            department: isFaculty ? payload.department || null : null,
            designation: isFaculty ? payload.designation || null : null,
            approvalStatus: isFaculty ? ApprovalStatus.pending : ApprovalStatus.approved,
        },
        select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            facultyId: true,
            department: true,
            designation: true,
            role: true,
            approvalStatus: true,
            createdAt: true,
        },
    });

    const otp = await issueOtp({
        userId: user.id,
        purpose: OtpPurpose.registration,
        deliverToEmail: user.email,
        userName: user.name,
        purposeLabel: REGISTRATION_OTP_PURPOSE_LABEL,
    });

    return {
        user,
        requiresEmailVerification: true,
        requiresAdminApproval: isFaculty,
        otp,
    };
};

/**
 * Consume the registration code. A student account goes live immediately and
 * receives tokens; a faculty account stays locked pending admin approval.
 */
const verifyRegistration = async (payload: IVerifyRegistrationPayload) => {
    const user = await getPendingRegistrationUser(payload.email);

    await consumeOtp(user.id, OtpPurpose.registration, payload.code);

    const isFaculty = user.role === Role.faculty;
    const needsApproval = isFaculty && user.approvalStatus === ApprovalStatus.pending;

    const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerifiedAt: new Date(),
            // Only an approved account may sign in.
            isActive: !needsApproval,
        },
        select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            role: true,
            approvalStatus: true,
        },
    });

    if (needsApproval) {
        const approverEmails = await getLibraryApproverEmails();
        await emailService
            .sendFacultyPendingApprovalEmail({
                toEmails: approverEmails,
                facultyName: user.name,
                facultyEmail: user.email,
                facultyId: user.facultyId,
                department: user.department,
                designation: user.designation,
            })
            .catch((err) => console.error("Failed to notify admins of faculty signup:", err));

        return {
            user: verifiedUser,
            requiresAdminApproval: true,
            accessToken: null,
            refreshToken: null,
        };
    }

    const tokenPayload: ITokenPayload = {
        userId: verifiedUser.id,
        email: verifiedUser.email,
        role: verifiedUser.role,
    };

    return {
        user: verifiedUser,
        requiresAdminApproval: false,
        accessToken: tokenUtils.getAccessToken(tokenPayload),
        refreshToken: tokenUtils.getRefreshToken(tokenPayload),
    };
};

/**
 * Mail a fresh registration code. Rate limited by the shared OTP cooldown.
 */
const resendRegistrationOtp = async (payload: IResendRegistrationOtpPayload) => {
    const user = await getPendingRegistrationUser(payload.email);

    return issueOtp({
        userId: user.id,
        purpose: OtpPurpose.registration,
        deliverToEmail: user.email,
        userName: user.name,
        purposeLabel: REGISTRATION_OTP_PURPOSE_LABEL,
        enforceCooldown: true,
    });
};

/**
 * Login — validates credentials and returns access + refresh tokens.
 */
const login = async (payload: ILoginPayload) => {
    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email: payload.email },
    });

    if (!user) {
        throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
    }

    // Gate order matters: tell a verified-but-unapproved user what is missing,
    // and never reveal account state before the password checks out.
    if (!user.emailVerifiedAt) {
        throw new AppError(
            status.FORBIDDEN,
            "Verify your email address first. Enter the code we emailed you, or request a new one."
        );
    }

    if (user.approvalStatus === ApprovalStatus.pending) {
        throw new AppError(
            status.FORBIDDEN,
            "Your faculty account is awaiting admin approval. You will receive an email once it is reviewed."
        );
    }

    if (user.approvalStatus === ApprovalStatus.rejected) {
        throw new AppError(
            status.FORBIDDEN,
            user.rejectionReason
                ? `Your account request was declined: ${user.rejectionReason}`
                : "Your account request was declined. Contact the library office for details."
        );
    }

    if (!user.isActive) {
        throw new AppError(status.UNAUTHORIZED, "Your account has been deactivated. Please contact support.");
    }

    // Generate tokens
    const tokenPayload: ITokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };

    const accessToken = tokenUtils.getAccessToken(tokenPayload);
    const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
};

/**
 * Refresh — exchange a valid refresh token for a new access token.
 */
const refreshAccessToken = async (refreshToken: string) => {
    // Verify the refresh token
    const verified = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET);

    if (!verified.success || !verified.data) {
        throw new AppError(status.UNAUTHORIZED, "Invalid or expired refresh token");
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
        where: { id: verified.data.userId },
        select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
        throw new AppError(status.UNAUTHORIZED, "User no longer exists");
    }

    if (!user.isActive) {
        throw new AppError(status.UNAUTHORIZED, "Your account has been deactivated");
    }

    // Generate new access token
    const tokenPayload: ITokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };

    const newAccessToken = tokenUtils.getAccessToken(tokenPayload);

    return {
        accessToken: newAccessToken,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
        },
    };
};

/**
 * Get current authenticated user profile
 */
const getMe = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            role: true,
            createdAt: true,
            isActive: true,
        },
    });

    if (!user) {
        throw new AppError(status.UNAUTHORIZED, "User not found");
    }

    if (!user.isActive) {
        throw new AppError(status.UNAUTHORIZED, "Your account has been deactivated");
    }

    const { isActive, ...userData } = user;
    return userData;
};

export const AuthService = {
    register,
    verifyRegistration,
    resendRegistrationOtp,
    login,
    refreshAccessToken,
    getMe,
};
