import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { SeatService } from "./seat.service";

const createSeat = catchAsync(async (req: Request, res: Response) => {
    const zoneId = req.params.id as string; // from /zone/:id/seats
    const result = await SeatService.createSeat({
        ...req.body,
        zoneId,
    });

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Seat added to zone successfully",
        data: result,
    });
});

const getSeatsByZone = catchAsync(async (req: Request, res: Response) => {
    const zoneId = req.params.id as string; // from /zone/:id/seats
    const showInactive =
        (req.user?.role === "admin" || req.user?.role === "librarian") &&
        req.query.showInactive === "true";
    const scheduleId = req.query.scheduleId as string | undefined;
    const currentUserId = req.user?.userId;

    const result = await SeatService.getSeatsByZone(zoneId, showInactive, scheduleId, currentUserId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Seats retrieved successfully",
        data: result,
    });
});

const updateSeat = catchAsync(async (req: Request, res: Response) => {
    const result = await SeatService.updateSeat(req.params.id as string, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Seat updated successfully",
        data: result,
    });
});

const deleteSeat = catchAsync(async (req: Request, res: Response) => {
    const { deletedSeat, mode } = await SeatService.deleteSeat(req.params.id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message:
            mode === "hard"
                ? "Seat deleted successfully (hard deleted)"
                : "Seat deactivated successfully (soft deleted due to existing bookings)",
        data: deletedSeat,
    });
});

export const SeatController = {
    createSeat,
    getSeatsByZone,
    updateSeat,
    deleteSeat,
};
