import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import AppError from "../../helpers/AppError";
import { UserService } from "./user.service";

const requireUserId = (req: Request): string => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};

const getProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getProfile(requireUserId(req));
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Profile retrieved successfully",
        data: result,
    });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.updateProfile(requireUserId(req), req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Profile updated successfully",
        data: result,
    });
});

const requestEmailChange = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.requestEmailChange(requireUserId(req), req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Verification code sent to your new email address",
        data: result,
    });
});

const verifyEmailChange = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.verifyEmailChange(requireUserId(req), req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Email address updated successfully",
        data: result,
    });
});

const requestPasswordChange = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.requestPasswordChange(requireUserId(req), req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Verification code sent to your registered email address",
        data: result,
    });
});

const verifyPasswordChange = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.verifyPasswordChange(requireUserId(req), req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const getMyFines = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getMyFines(requireUserId(req));
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fines retrieved successfully",
        data: result,
    });
});

export const UserController = {
    getProfile,
    updateProfile,
    requestEmailChange,
    verifyEmailChange,
    requestPasswordChange,
    verifyPasswordChange,
    getMyFines,
};
