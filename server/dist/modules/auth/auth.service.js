"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const envVars_1 = require("../../config/envVars");
const token_1 = require("../../utils/token");
const jwt_1 = require("../../utils/jwt");
const enums_1 = require("../../generated/enums");
const otp_1 = require("../../lib/otp");
const email_service_1 = require("../../services/email.service");
const REGISTRATION_OTP_PURPOSE_LABEL = "verify your email address and activate your library account";
/** Addresses that review faculty signups and waiver petitions. */
const getLibraryApproverEmails = async () => {
    const approvers = await prisma_1.default.user.findMany({
        where: { role: enums_1.Role.admin, isActive: true },
        select: { email: true },
    });
    return approvers.map((a) => a.email);
};
/** Look up an account by email for the public verification endpoints. */
const getPendingRegistrationUser = async (email) => {
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "No account found for this email address");
    }
    if (user.emailVerifiedAt) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This email address is already verified");
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
const register = async (payload) => {
    // Check if user already exists
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email: payload.email },
    });
    if (existingUser) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this email already exists");
    }
    const requestedRole = payload.role === "faculty" ? enums_1.Role.faculty : enums_1.Role.student;
    // Check if facultyId is already taken
    if (requestedRole === enums_1.Role.faculty && payload.facultyId) {
        const existingFaculty = await prisma_1.default.user.findUnique({
            where: { facultyId: payload.facultyId },
        });
        if (existingFaculty) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "This faculty ID is already registered");
        }
    }
    // Check if studentId is already taken
    if (payload.studentId) {
        const existingStudent = await prisma_1.default.user.findUnique({
            where: { studentId: payload.studentId },
        });
        if (existingStudent) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "This student ID is already registered");
        }
    }
    // Hash password
    const passwordHash = await bcryptjs_1.default.hash(payload.password, envVars_1.envVars.BCRYPT_SALT_ROUNDS);
    const isFaculty = requestedRole === enums_1.Role.faculty;
    // The account is inert until the email code is consumed, and — for faculty —
    // until an admin approves it.
    const user = await prisma_1.default.user.create({
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
            approvalStatus: isFaculty ? enums_1.ApprovalStatus.pending : enums_1.ApprovalStatus.approved,
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
    const otp = await (0, otp_1.issueOtp)({
        userId: user.id,
        purpose: enums_1.OtpPurpose.registration,
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
const verifyRegistration = async (payload) => {
    const user = await getPendingRegistrationUser(payload.email);
    await (0, otp_1.consumeOtp)(user.id, enums_1.OtpPurpose.registration, payload.code);
    const isFaculty = user.role === enums_1.Role.faculty;
    const needsApproval = isFaculty && user.approvalStatus === enums_1.ApprovalStatus.pending;
    const verifiedUser = await prisma_1.default.user.update({
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
        await email_service_1.emailService
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
    const tokenPayload = {
        userId: verifiedUser.id,
        email: verifiedUser.email,
        role: verifiedUser.role,
    };
    return {
        user: verifiedUser,
        requiresAdminApproval: false,
        accessToken: token_1.tokenUtils.getAccessToken(tokenPayload),
        refreshToken: token_1.tokenUtils.getRefreshToken(tokenPayload),
    };
};
/**
 * Mail a fresh registration code. Rate limited by the shared OTP cooldown.
 */
const resendRegistrationOtp = async (payload) => {
    const user = await getPendingRegistrationUser(payload.email);
    return (0, otp_1.issueOtp)({
        userId: user.id,
        purpose: enums_1.OtpPurpose.registration,
        deliverToEmail: user.email,
        userName: user.name,
        purposeLabel: REGISTRATION_OTP_PURPOSE_LABEL,
        enforceCooldown: true,
    });
};
/**
 * Login — validates credentials and returns access + refresh tokens.
 */
const login = async (payload) => {
    // Find user by email
    const user = await prisma_1.default.user.findUnique({
        where: { email: payload.email },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid email or password");
    }
    // Verify password
    const isPasswordValid = await bcryptjs_1.default.compare(payload.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid email or password");
    }
    // Gate order matters: tell a verified-but-unapproved user what is missing,
    // and never reveal account state before the password checks out.
    if (!user.emailVerifiedAt) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Verify your email address first. Enter the code we emailed you, or request a new one.");
    }
    if (user.approvalStatus === enums_1.ApprovalStatus.pending) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Your faculty account is awaiting admin approval. You will receive an email once it is reviewed.");
    }
    if (user.approvalStatus === enums_1.ApprovalStatus.rejected) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, user.rejectionReason
            ? `Your account request was declined: ${user.rejectionReason}`
            : "Your account request was declined. Contact the library office for details.");
    }
    if (!user.isActive) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Your account has been deactivated. Please contact support.");
    }
    // Generate tokens
    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const accessToken = token_1.tokenUtils.getAccessToken(tokenPayload);
    const refreshToken = token_1.tokenUtils.getRefreshToken(tokenPayload);
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
const refreshAccessToken = async (refreshToken) => {
    // Verify the refresh token
    const verified = jwt_1.jwtUtils.verifyToken(refreshToken, envVars_1.envVars.REFRESH_TOKEN_SECRET);
    if (!verified.success || !verified.data) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid or expired refresh token");
    }
    // Check if user still exists and is active
    const user = await prisma_1.default.user.findUnique({
        where: { id: verified.data.userId },
        select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "User no longer exists");
    }
    if (!user.isActive) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Your account has been deactivated");
    }
    // Generate new access token
    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const newAccessToken = token_1.tokenUtils.getAccessToken(tokenPayload);
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
const getMe = async (userId) => {
    const user = await prisma_1.default.user.findUnique({
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
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "User not found");
    }
    if (!user.isActive) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Your account has been deactivated");
    }
    const { isActive, ...userData } = user;
    return userData;
};
exports.AuthService = {
    register,
    verifyRegistration,
    resendRegistrationOtp,
    login,
    refreshAccessToken,
    getMe,
};
