"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authCheck = void 0;
const cookie_1 = require("../utils/cookie");
const AppError_1 = __importDefault(require("../helpers/AppError"));
const http_status_1 = __importDefault(require("http-status"));
const jwt_1 = require("../utils/jwt");
const envVars_1 = require("../config/envVars");
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Auth middleware — verifies JWT access token from cookies and enforces role-based access.
 * Pass roles to restrict access: authCheck("admin", "librarian")
 * Pass no roles to allow any authenticated user: authCheck()
 */
const authCheck = (...roles) => {
    return async (req, res, next) => {
        try {
            // 1. Extract access token from cookie
            const accessToken = cookie_1.cookieUtils.getCookie(req, "accessToken");
            if (!accessToken) {
                throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: No access token provided");
            }
            // 2. Verify token
            const verifiedToken = jwt_1.jwtUtils.verifyToken(accessToken, envVars_1.envVars.ACCESS_TOKEN_SECRET);
            if (!verifiedToken.success || !verifiedToken.data) {
                throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: Invalid or expired access token");
            }
            // 3. Check if user still exists and is active
            const user = await prisma_1.default.user.findUnique({
                where: { id: verifiedToken.data.userId },
                select: { id: true, email: true, role: true, isActive: true },
            });
            if (!user) {
                throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: User no longer exists");
            }
            if (!user.isActive) {
                throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Your account has been deactivated. Please contact support.");
            }
            // 4. Check role-based access
            if (roles.length > 0 && !roles.includes(user.role)) {
                throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Forbidden: You don't have permission to access this resource");
            }
            // 5. Attach user to request
            req.user = {
                userId: user.id,
                email: user.email,
                role: user.role,
            };
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.authCheck = authCheck;
exports.default = exports.authCheck;
