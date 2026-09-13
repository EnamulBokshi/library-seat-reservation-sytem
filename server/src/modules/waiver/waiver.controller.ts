import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import AppError from "../../helpers/AppError";
import { WaiverService } from "./waiver.service";

const requireUserId = (req: Request): string => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};

const createWaiverRequest = catchAsync(async (req: Request, res: Response) => {
    const result = await WaiverService.createWaiverRequest(requireUserId(req), req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Fine waiver request submitted for admin review",
        data: result,
    });
});

const lookupStudentFines = catchAsync(async (req: Request, res: Response) => {
    const identifier = String(req.query.identifier ?? "");
    if (!identifier.trim()) {
        throw new AppError(status.BAD_REQUEST, "Provide a student ID, email or account id to look up");
    }

    const result = await WaiverService.lookupStudentFines(identifier);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Student fines retrieved successfully",
        data: result,
    });
});

const getMyWaiverRequests = catchAsync(async (req: Request, res: Response) => {
    const result = await WaiverService.getMyWaiverRequests(requireUserId(req));

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Your waiver requests retrieved successfully",
        data: result,
    });
});

const getAllWaiverRequests = catchAsync(async (req: Request, res: Response) => {
    const result = await WaiverService.getAllWaiverRequests({
        status: req.query.status as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Waiver requests retrieved successfully",
        data: result.requests,
        meta: result.meta,
    });
});

const decideWaiverRequest = catchAsync(async (req: Request, res: Response) => {
    const result = await WaiverService.decideWaiverRequest(
        String(req.params.id),
        requireUserId(req),
        req.body
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: `Waiver request ${result.status}`,
        data: result,
    });
});

export const WaiverController = {
    createWaiverRequest,
    lookupStudentFines,
    getMyWaiverRequests,
    getAllWaiverRequests,
    decideWaiverRequest,
};
