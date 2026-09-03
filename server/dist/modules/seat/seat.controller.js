"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const seat_service_1 = require("./seat.service");
const createSeat = (0, CatchAsync_1.default)(async (req, res) => {
    const zoneId = req.params.id; // from /zone/:id/seats
    const result = await seat_service_1.SeatService.createSeat({
        ...req.body,
        zoneId,
    });
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Seat added to zone successfully",
        data: result,
    });
});
const getSeatsByZone = (0, CatchAsync_1.default)(async (req, res) => {
    const zoneId = req.params.id; // from /zone/:id/seats
    const showInactive = (req.user?.role === "admin" || req.user?.role === "librarian") &&
        req.query.showInactive === "true";
    const scheduleId = req.query.scheduleId;
    const currentUserId = req.user?.userId;
    const result = await seat_service_1.SeatService.getSeatsByZone(zoneId, showInactive, scheduleId, currentUserId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Seats retrieved successfully",
        data: result,
    });
});
const updateSeat = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await seat_service_1.SeatService.updateSeat(req.params.id, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Seat updated successfully",
        data: result,
    });
});
const deleteSeat = (0, CatchAsync_1.default)(async (req, res) => {
    const { deletedSeat, mode } = await seat_service_1.SeatService.deleteSeat(req.params.id);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: mode === "hard"
            ? "Seat deleted successfully (hard deleted)"
            : "Seat deactivated successfully (soft deleted due to existing bookings)",
        data: deletedSeat,
    });
});
exports.SeatController = {
    createSeat,
    getSeatsByZone,
    updateSeat,
    deleteSeat,
};
