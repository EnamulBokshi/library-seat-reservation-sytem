"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const auth_service_1 = require("./auth.service");
const token_1 = require("../../utils/token");
const cookie_1 = require("../../utils/cookie");
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const register = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.AuthService.register(req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: `Registration received. We emailed a 6-digit verification code to ${result.user.email}.`,
        data: result,
    });
});
const verifyRegistration = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.AuthService.verifyRegistration(req.body);
    // A faculty account gets no session until an admin approves it.
    if (result.accessToken && result.refreshToken) {
        token_1.tokenUtils.setAccessTokenCookie(res, result.accessToken);
        token_1.tokenUtils.setRefreshTokenCookie(res, result.refreshToken);
    }
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.requiresAdminApproval
            ? "Email verified. Your faculty account is now awaiting admin approval."
            : "Email verified. Your account is active.",
        data: {
            user: result.user,
            requiresAdminApproval: result.requiresAdminApproval,
        },
    });
});
const resendRegistrationOtp = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.AuthService.resendRegistrationOtp(req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `A new verification code was sent to ${result.sentTo}.`,
        data: result,
    });
});
const login = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.AuthService.login(req.body);
    // Set tokens in httpOnly cookies
    token_1.tokenUtils.setAccessTokenCookie(res, result.accessToken);
    token_1.tokenUtils.setRefreshTokenCookie(res, result.refreshToken);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Login successful",
        data: { user: result.user },
    });
});
const clearAuthCookies = (res) => {
    token_1.tokenUtils.clearAuthCookies(res);
};
const refresh = (0, CatchAsync_1.default)(async (req, res) => {
    const refreshToken = cookie_1.cookieUtils.getCookie(req, "refreshToken");
    if (!refreshToken) {
        clearAuthCookies(res);
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "No refresh token provided");
    }
    // A refresh token that no longer works must not linger in the browser:
    // the client route guard treats a stale cookie as a live session.
    let result;
    try {
        result = await auth_service_1.AuthService.refreshAccessToken(refreshToken);
    }
    catch (error) {
        clearAuthCookies(res);
        throw error;
    }
    // Set new access token cookie
    token_1.tokenUtils.setAccessTokenCookie(res, result.accessToken);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Token refreshed successfully",
        data: { user: result.user },
    });
});
const getMe = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized");
    }
    const user = await auth_service_1.AuthService.getMe(userId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "User profile fetched successfully",
        data: { user },
    });
});
const logout = (0, CatchAsync_1.default)(async (req, res) => {
    // Clear both token cookies
    clearAuthCookies(res);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Logged out successfully",
    });
});
exports.AuthController = {
    register,
    verifyRegistration,
    resendRegistrationOtp,
    login,
    refresh,
    getMe,
    logout,
};
