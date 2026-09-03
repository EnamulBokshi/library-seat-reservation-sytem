"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const schedule_service_1 = require("./schedule.service");
const getAdminSchedules = (0, CatchAsync_1.default)(async (req, res) => {
    const { startDate, endDate } = req.query;
    const result = await schedule_service_1.ScheduleService.getAdminSchedules(startDate ? String(startDate) : undefined, endDate ? String(endDate) : undefined);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Admin schedules retrieved successfully",
        data: result,
    });
});
const toggleScheduleSlot = (0, CatchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const { isOpen } = req.body;
    const result = await schedule_service_1.ScheduleService.toggleScheduleSlot(id, Boolean(isOpen));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `Schedule slot ${isOpen ? "opened" : "closed"} successfully`,
        data: result,
    });
});
const bulkToggleSchedules = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await schedule_service_1.ScheduleService.bulkToggleSchedules(req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.message,
        data: result,
    });
});
const generateSchedules = (0, CatchAsync_1.default)(async (req, res) => {
    const { daysAhead } = req.body;
    const result = await schedule_service_1.ScheduleService.generateSchedules(daysAhead ? parseInt(daysAhead, 10) : 14);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.message,
        data: result,
    });
});
exports.ScheduleController = {
    getAdminSchedules,
    toggleScheduleSlot,
    bulkToggleSchedules,
    generateSchedules,
};
