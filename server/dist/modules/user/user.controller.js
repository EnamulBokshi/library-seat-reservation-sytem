"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const user_service_1 = require("./user.service");
/** Express 5 types a wildcard param as string | string[]; routes here pass one id. */
const requireIdParam = (req) => String(req.params.id);
const requireUserId = (req) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};
const listUsers = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.listUsers({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        role: req.query.role,
        approvalStatus: req.query.approvalStatus,
        searchTerm: req.query.searchTerm,
    });
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Users retrieved successfully",
        data: result.users,
        meta: result.meta,
    });
});
const getPendingApprovals = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.getPendingApprovals({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        approvalStatus: req.query.approvalStatus,
        role: req.query.role,
        searchTerm: req.query.searchTerm,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder === "desc" ? "desc" : "asc",
        emailVerifiedOnly: req.query.emailVerifiedOnly === undefined
            ? undefined
            : req.query.emailVerifiedOnly !== "false",
    });
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Account approvals retrieved successfully",
        data: result.requests,
        meta: { ...result.meta, counts: result.counts },
    });
});
const approveUser = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.approveUser(requireIdParam(req), requireUserId(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Account approved successfully",
        data: result,
    });
});
const rejectUser = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.rejectUser(requireIdParam(req), requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Account request rejected",
        data: result,
    });
});
const getProfile = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.getProfile(requireUserId(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Profile retrieved successfully",
        data: result,
    });
});
const updateProfile = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.updateProfile(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Profile updated successfully",
        data: result,
    });
});
const requestEmailChange = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.requestEmailChange(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Verification code sent to your new email address",
        data: result,
    });
});
const verifyEmailChange = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.verifyEmailChange(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Email address updated successfully",
        data: result,
    });
});
const requestPasswordChange = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.requestPasswordChange(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Verification code sent to your registered email address",
        data: result,
    });
});
const verifyPasswordChange = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.verifyPasswordChange(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.message,
        data: null,
    });
});
const getMyFines = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.UserService.getMyFines(requireUserId(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Fines retrieved successfully",
        data: result,
    });
});
exports.UserController = {
    listUsers,
    getPendingApprovals,
    approveUser,
    rejectUser,
    getProfile,
    updateProfile,
    requestEmailChange,
    verifyEmailChange,
    requestPasswordChange,
    verifyPasswordChange,
    getMyFines,
};
