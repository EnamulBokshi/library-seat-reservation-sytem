import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { BookingService } from "./booking.service";
import { BookingStatus } from "../../generated/enums";

const createBooking = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await BookingService.createBooking(userId, req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Seat reserved successfully",
        data: result,
    });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await BookingService.getMyBookings(userId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "My bookings retrieved successfully",
        data: result,
    });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
    const filters = {
        status: req.query.status as BookingStatus | undefined,
        userId: req.query.userId as string | undefined,
        date: req.query.date as string | undefined,
        zoneId: req.query.zoneId as string | undefined,
    };

    const result = await BookingService.getAllBookings(filters);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "All bookings retrieved successfully",
        data: result,
    });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
    const bookingId = req.params.id as string;
    const userId = req.user.userId;
    const role = req.user.role;

    const result = await BookingService.cancelBooking(bookingId, userId, role);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Booking cancelled successfully",
        data: result,
    });
});

export const BookingController = {
    createBooking,
    getMyBookings,
    getAllBookings,
    cancelBooking,
};
