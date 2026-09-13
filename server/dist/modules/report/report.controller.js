"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const report_service_1 = require("./report.service");
const requireUserId = (req) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};
const readFilters = (req) => ({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status,
    category: req.query.category,
    priority: req.query.priority,
    searchTerm: req.query.searchTerm,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
});
const createReport = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await report_service_1.ReportService.createReport(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Report submitted. The library team has been notified.",
        data: result,
    });
});
const getMyReports = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await report_service_1.ReportService.getMyReports(requireUserId(req), readFilters(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Your reports retrieved successfully",
        data: result.reports,
        meta: result.meta,
    });
});
const getAllReports = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await report_service_1.ReportService.getAllReports(readFilters(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Reports retrieved successfully",
        data: result.reports,
        meta: result.meta,
    });
});
const getReportById = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await report_service_1.ReportService.getReportById(String(req.params.id), requireUserId(req), req.user?.role);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Report retrieved successfully",
        data: result,
    });
});
const updateReportStatus = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await report_service_1.ReportService.updateReportStatus(String(req.params.id), requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `Report marked as ${result.status}`,
        data: result,
    });
});
exports.ReportController = {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    updateReportStatus,
};
