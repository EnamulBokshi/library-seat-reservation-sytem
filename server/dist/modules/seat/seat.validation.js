"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatValidation = exports.updateSeatSchema = exports.createSeatSchema = void 0;
const zod_1 = require("zod");
exports.createSeatSchema = zod_1.z.object({
    seatNumber: zod_1.z.string({ error: "Seat number is required" }).min(1, "Seat number cannot be empty"),
});
exports.updateSeatSchema = zod_1.z.object({
    seatNumber: zod_1.z.string().min(1, "Seat number cannot be empty").optional(),
    isActive: zod_1.z.boolean().optional(),
    isOccupied: zod_1.z.boolean().optional(),
});
exports.SeatValidation = {
    createSeatSchema: exports.createSeatSchema,
    updateSeatSchema: exports.updateSeatSchema,
};
