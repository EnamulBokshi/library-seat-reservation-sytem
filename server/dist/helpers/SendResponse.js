"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResponse = void 0;
const sendResponse = async (res, data) => {
    res.status(data.httpStatusCode).json({
        success: data.success,
        data: data.data || null,
        message: data.message || null,
        meta: data.meta || null
    });
};
exports.sendResponse = sendResponse;
