"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const setting_service_1 = require("./setting.service");
const getAllSettings = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await setting_service_1.SettingService.getAllSettings();
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Settings retrieved successfully",
        data: result,
    });
});
const getSettingByKey = (0, CatchAsync_1.default)(async (req, res) => {
    const { key } = req.params;
    const result = await setting_service_1.SettingService.getSettingByKey(key);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Setting retrieved successfully",
        data: result,
    });
});
const updateSetting = (0, CatchAsync_1.default)(async (req, res) => {
    const { key } = req.params;
    const { value, description } = req.body;
    const result = await setting_service_1.SettingService.updateSetting(key, value, description);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Setting updated successfully",
        data: result,
    });
});
exports.SettingController = {
    getAllSettings,
    getSettingByKey,
    updateSetting,
};
