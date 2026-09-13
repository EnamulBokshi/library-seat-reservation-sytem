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

    // The client tracks its own "last opened the notice page" stamp; an unparsable
    // value is treated as absent, which simply counts every live notice as new.
    const rawSince = req.query.noticesSince as string | undefined;
    const parsedSince = rawSince ? new Date(rawSince) : null;
    const noticesSince = parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince : null;

    const result = await DashboardService.getNavBadgeCounts(userId, role as Role, { noticesSince });

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
