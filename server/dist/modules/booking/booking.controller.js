"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const booking_service_1 = require("./booking.service");
const createBooking = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await booking_service_1.BookingService.createBooking(userId, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Seat reserved successfully",
        data: result,
    });
});
const getMyBookings = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await booking_service_1.BookingService.getMyBookings(userId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "My bookings retrieved successfully",
        data: result,
    });
});
const getAllBookings = (0, CatchAsync_1.default)(async (req, res) => {
    const filters = {
        status: req.query.status,
        userId: req.query.userId,
        date: req.query.date,
        slot: req.query.slot,
        zoneId: req.query.zoneId,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
    };
    const result = await booking_service_1.BookingService.getAllBookings(filters);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "All bookings retrieved successfully",
        data: result.bookings,
        meta: result.meta,
    });
});
const cancelBooking = (0, CatchAsync_1.default)(async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user.userId;
    const role = req.user.role;
    const cancelReason = (req.body?.cancelReason || req.query?.cancelReason);
    const result = await booking_service_1.BookingService.cancelBooking(bookingId, userId, role, cancelReason);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Booking cancelled successfully",
        data: result,
    });
});
const getSchedules = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await booking_service_1.BookingService.getSchedules();
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Available schedules retrieved successfully",
        data: result,
    });
});
const getBookingById = (0, CatchAsync_1.default)(async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user.userId;
    const role = req.user.role;
    const result = await booking_service_1.BookingService.getBookingById(bookingId, userId, role);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Booking details retrieved successfully",
        data: result,
    });
});
const getDashboardStats = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const role = req.user.role;
    const result = await booking_service_1.BookingService.getDashboardStats(userId, role);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Dashboard analytics retrieved successfully",
        data: result,
    });
});
const getFCFSQuickAssign = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await booking_service_1.BookingService.getFCFSQuickAssign(userId, {
        zoneId: req.query.zoneId,
        scheduleId: req.query.scheduleId,
        partySize: req.query.partySize ? parseInt(req.query.partySize, 10) : 1,
    });
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "FCFS recommendation found",
        data: result,
    });
});
exports.BookingController = {
    createBooking,
    getFCFSQuickAssign,
    getMyBookings,
    getAllBookings,
    getBookingById,
    cancelBooking,
    getSchedules,
    getDashboardStats,
};
