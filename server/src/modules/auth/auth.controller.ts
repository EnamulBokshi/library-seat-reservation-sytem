import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { AuthService } from "./auth.service";
import { tokenUtils } from "../../utils/token";
import { cookieUtils } from "../../utils/cookie";
import AppError from "../../helpers/AppError";

const register = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Registration successful",
        data: result,
    });
});

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);

    // Set tokens in httpOnly cookies
    tokenUtils.setAccessTokenCookie(res, result.accessToken);
    tokenUtils.setRefreshTokenCookie(res, result.refreshToken);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Login successful",
        data: { user: result.user },
    });
});

const refresh = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = cookieUtils.getCookie(req, "refreshToken");
    if (!refreshToken) {
        throw new AppError(status.UNAUTHORIZED, "No refresh token provided");
    }

    const result = await AuthService.refreshAccessToken(refreshToken);

    // Set new access token cookie
    tokenUtils.setAccessTokenCookie(res, result.accessToken);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Token refreshed successfully",
        data: { user: result.user },
    });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    }

    const user = await AuthService.getMe(userId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User profile fetched successfully",
        data: { user },
    });
});

const logout = catchAsync(async (req: Request, res: Response) => {
    // Clear both token cookies
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Logged out successfully",
    });
});

export const AuthController = {
    register,
    login,
    refresh,
    getMe,
    logout,
};
