import bcrypt from "bcryptjs";
import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { envVars } from "../../config/envVars";
import { tokenUtils } from "../../utils/token";
import { jwtUtils } from "../../utils/jwt";
import { IRegisterPayload, ILoginPayload, ITokenPayload } from "./auth.interface";

/**
 * Register a new student account.
 * Only students can self-register. Librarians and admins are created by admins.
 */
const register = async (payload: IRegisterPayload) => {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: payload.email },
    });

    if (existingUser) {
        throw new AppError(status.CONFLICT, "A user with this email already exists");
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

    // Create user with student role
    const user = await prisma.user.create({
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
const login = async (payload: ILoginPayload) => {
    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email: payload.email },
    });

    if (!user) {
        throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
    }

    if (!user.isActive) {
        throw new AppError(status.UNAUTHORIZED, "Your account has been deactivated. Please contact support.");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
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

    return { accessToken: newAccessToken };
};

export const AuthService = {
    register,
    login,
    refreshAccessToken,
};
