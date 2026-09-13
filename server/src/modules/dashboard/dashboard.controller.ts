import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import AppError from "../../helpers/AppError";
import { DashboardService } from "./dashboard.service";
import { Role } from "../../generated/enums";

const getNavBadgeCounts = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId || !role) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    }

    const result = await DashboardService.getNavBadgeCounts(userId, role as Role);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Navigation badge counts retrieved successfully",
        data: result,
    });
});

export const DashboardController = {
    getNavBadgeCounts,
};
