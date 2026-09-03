import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { CheckInService } from "./checkin.service";

const scanQR = catchAsync(async (req: Request, res: Response) => {
    const { qrToken } = req.body;
    const result = await CheckInService.scanQR(qrToken);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.message,
        data: {
            action: result.action,
            booking: result.booking,
        },
    });
});

export const CheckInController = {
    scanQR,
};
