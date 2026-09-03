import { Request, Response, NextFunction } from "express";
import { cookieUtils } from "../utils/cookie";
import AppError from "../helpers/AppError";
import status from "http-status";
import { jwtUtils } from "../utils/jwt";
import { envVars } from "../config/envVars";
import { Role } from "../generated/enums";
import prisma from "../lib/prisma";

/**
 * Auth middleware — verifies JWT access token from cookies and enforces role-based access.
 * Pass roles to restrict access: authCheck("admin", "librarian")
 * Pass no roles to allow any authenticated user: authCheck()
 */
export const authCheck = (...roles: Role[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Extract access token from cookie
            const accessToken = cookieUtils.getCookie(req, "accessToken");
            if (!accessToken) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized: No access token provided");
            }

            // 2. Verify token
            const verifiedToken = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);
            if (!verifiedToken.success || !verifiedToken.data) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized: Invalid or expired access token");
            }

            // 3. Check if user still exists and is active
            const user = await prisma.user.findUnique({
                where: { id: verifiedToken.data.userId },
                select: { id: true, email: true, role: true, isActive: true },
            });

            if (!user) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized: User no longer exists");
            }

            if (!user.isActive) {
                throw new AppError(status.UNAUTHORIZED, "Your account has been deactivated. Please contact support.");
            }

            // 4. Check role-based access
            if (roles.length > 0 && !roles.includes(user.role as Role)) {
                throw new AppError(status.FORBIDDEN, "Forbidden: You don't have permission to access this resource");
            }

            // 5. Attach user to request
            req.user = {
                userId: user.id,
                email: user.email,
                role: user.role as Role,
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};

export default authCheck;