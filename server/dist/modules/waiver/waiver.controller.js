"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiverController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const waiver_service_1 = require("./waiver.service");
const requireUserId = (req) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};
const createWaiverRequest = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await waiver_service_1.WaiverService.createWaiverRequest(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Fine waiver request submitted for admin review",
        data: result,
    });
});
const lookupStudentFines = (0, CatchAsync_1.default)(async (req, res) => {
    const identifier = String(req.query.identifier ?? "");
    if (!identifier.trim()) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Provide a student ID, email or account id to look up");
    }
    const result = await waiver_service_1.WaiverService.lookupStudentFines(identifier);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Student fines retrieved successfully",
        data: result,
    });
});
const getMyWaiverRequests = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await waiver_service_1.WaiverService.getMyWaiverRequests(requireUserId(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Your waiver requests retrieved successfully",
        data: result,
    });
});
const getAllWaiverRequests = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await waiver_service_1.WaiverService.getAllWaiverRequests({
        status: req.query.status,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Waiver requests retrieved successfully",
        data: result.requests,
        meta: result.meta,
    });
});
const decideWaiverRequest = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await waiver_service_1.WaiverService.decideWaiverRequest(String(req.params.id), requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `Waiver request ${result.status}`,
        data: result,
    });
});
exports.WaiverController = {
    createWaiverRequest,
    lookupStudentFines,
    getMyWaiverRequests,
    getAllWaiverRequests,
    decideWaiverRequest,
};
