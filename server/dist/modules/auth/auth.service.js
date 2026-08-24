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
/**
 * Register a new student account.
 * Only students can self-register. Librarians and admins are created by admins.
 */
const register = async (payload) => {
    // Check if user already exists
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email: payload.email },
    });
    if (existingUser) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A user with this email already exists");
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
    // Create user with student role
    const user = await prisma_1.default.user.create({
        data: {
            name: payload.name,
            email: payload.email,
            studentId: payload.studentId || null,
            passwordHash,
            role: "student",
        },
        select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            role: true,
            createdAt: true,
        },
    });
    return user;
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
    if (!user.isActive) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Your account has been deactivated. Please contact support.");
    }
    // Verify password
    const isPasswordValid = await bcryptjs_1.default.compare(payload.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid email or password");
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
    login,
    refreshAccessToken,
    getMe,
};
