"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const dashboard_service_1 = require("./dashboard.service");
const getNavBadgeCounts = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId || !role) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized");
    }
    const result = await dashboard_service_1.DashboardService.getNavBadgeCounts(userId, role);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Navigation badge counts retrieved successfully",
        data: result,
    });
});
exports.DashboardController = {
    getNavBadgeCounts,
};
