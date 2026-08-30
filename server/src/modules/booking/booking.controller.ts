import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { BookingService } from "./booking.service";
import { BookingStatus, SlotType } from "../../generated/enums";

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
        slot: req.query.slot as SlotType | undefined,
        zoneId: req.query.zoneId as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page as string | undefined,
        limit: req.query.limit as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
    };

    const result = await BookingService.getAllBookings(filters);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "All bookings retrieved successfully",
        data: result.bookings,
        meta: result.meta,
    });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
    const bookingId = req.params.id as string;
    const userId = req.user.userId;
    const role = req.user.role;
    const cancelReason = (req.body?.cancelReason || req.query?.cancelReason) as string | undefined;

    const result = await BookingService.cancelBooking(bookingId, userId, role, cancelReason);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Booking cancelled successfully",
        data: result,
    });
});

const getSchedules = catchAsync(async (req: Request, res: Response) => {
    const result = await BookingService.getSchedules();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Available schedules retrieved successfully",
        data: result,
    });
});

const getBookingById = catchAsync(async (req: Request, res: Response) => {
    const bookingId = req.params.id as string;
    const userId = req.user.userId;
    const role = req.user.role;

    const result = await BookingService.getBookingById(bookingId, userId, role);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Booking details retrieved successfully",
        data: result,
    });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const role = req.user.role;

    const result = await BookingService.getDashboardStats(userId, role);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Dashboard analytics retrieved successfully",
        data: result,
    });
});

export const BookingController = {
    createBooking,
    getMyBookings,
    getAllBookings,
    getBookingById,
    cancelBooking,
    getSchedules,
    getDashboardStats,
};


