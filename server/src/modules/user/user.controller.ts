import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import AppError from "../../helpers/AppError";
import { UserService } from "./user.service";

/** Express 5 types a wildcard param as string | string[]; routes here pass one id. */
const requireIdParam = (req: Request): string => String(req.params.id);

const requireUserId = (req: Request): string => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};

const listUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.listUsers({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        role: req.query.role as string | undefined,
        approvalStatus: req.query.approvalStatus as string | undefined,
        searchTerm: req.query.searchTerm as string | undefined,
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Users retrieved successfully",
        data: result.users,
        meta: result.meta,
    });
});

const getPendingApprovals = catchAsync(async (_req: Request, res: Response) => {
    const result = await UserService.getPendingApprovals();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Pending account approvals retrieved successfully",
        data: result,
    });
});

const approveUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.approveUser(requireIdParam(req), requireUserId(req));
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Account approved successfully",
        data: result,
    });
});

const rejectUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.rejectUser(requireIdParam(req), requireUserId(req), req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Account request rejected",
        data: result,
    });
});

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
    listUsers,
    getPendingApprovals,
    approveUser,
    rejectUser,
    getProfile,
    updateProfile,
    requestEmailChange,
    verifyEmailChange,
    requestPasswordChange,
    verifyPasswordChange,
    getMyFines,
};
