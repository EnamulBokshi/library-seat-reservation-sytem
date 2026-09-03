"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckInController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const checkin_service_1 = require("./checkin.service");
const scanQR = (0, CatchAsync_1.default)(async (req, res) => {
    const { qrToken } = req.body;
    const result = await checkin_service_1.CheckInService.scanQR(qrToken);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.message,
        data: {
            action: result.action,
            booking: result.booking,
        },
    });
});
exports.CheckInController = {
    scanQR,
};
