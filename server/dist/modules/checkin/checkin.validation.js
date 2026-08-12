"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckInValidation = exports.scanQRSchema = void 0;
const zod_1 = require("zod");
exports.scanQRSchema = zod_1.z.object({
    qrToken: zod_1.z.string({ error: "QR token is required" }).uuid("Invalid QR token format"),
});
exports.CheckInValidation = {
    scanQRSchema: exports.scanQRSchema,
};
