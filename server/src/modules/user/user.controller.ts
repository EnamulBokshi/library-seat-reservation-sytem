import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import AppError from "../../helpers/AppError";
import { UserService } from "./user.service";
import { ApprovalSortField } from "./user.interface";

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
    const isActiveParam = req.query.isActive;
    const isActive =
        isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

    const result = await UserService.listUsers({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        role: req.query.role as string | undefined,
        isActive,
        approvalStatus: req.query.approvalStatus as string | undefined,
        searchTerm: req.query.searchTerm as string | undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Users retrieved successfully",
        data: result.users,
        meta: { ...result.meta, stats: result.stats },
    });
});

const getPendingApprovals = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getPendingApprovals({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        approvalStatus: req.query.approvalStatus as string | undefined,
        role: req.query.role as string | undefined,
        searchTerm: req.query.searchTerm as string | undefined,
        sortBy: req.query.sortBy as ApprovalSortField | undefined,
        sortOrder: req.query.sortOrder === "desc" ? "desc" : "asc",
        emailVerifiedOnly:
            req.query.emailVerifiedOnly === undefined
                ? undefined
                : req.query.emailVerifiedOnly !== "false",
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Account approvals retrieved successfully",
        data: result.requests,
        meta: { ...result.meta, counts: result.counts },
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

const createUser = catchAsync(async (req: Request, res: Response) => {
    const creatorUser = {
        userId: requireUserId(req),
        role: req.user!.role,
    };
    const result = await UserService.createUser(creatorUser, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "User created successfully",
        data: result,
    });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
    const updaterUser = {
        userId: requireUserId(req),
        role: req.user!.role,
    };
    const targetUserId = requireIdParam(req);
    const result = await UserService.updateUser(targetUserId, updaterUser, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User updated successfully",
        data: result,
    });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
    const deleterUser = {
        userId: requireUserId(req),
        role: req.user!.role,
    };
    const targetUserId = requireIdParam(req);
    const result = await UserService.deleteUser(targetUserId, deleterUser);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User deleted successfully",
        data: result,
    });
});

export const UserController = {
    listUsers,
    createUser,
    updateUser,
    deleteUser,
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
