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
const requireUserId = (req) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};
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
    getProfile,
    updateProfile,
    requestEmailChange,
    verifyEmailChange,
    requestPasswordChange,
    verifyPasswordChange,
    getMyFines,
};
