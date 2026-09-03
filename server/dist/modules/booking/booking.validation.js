"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingValidation = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
exports.createBookingSchema = zod_1.z.object({
    seatId: zod_1.z.string({ error: "Seat ID is required" }).uuid("Invalid Seat ID format"),
    scheduleId: zod_1.z.string({ error: "Schedule ID is required" }).uuid("Invalid Schedule ID format"),
});
exports.BookingValidation = {
    createBookingSchema: exports.createBookingSchema,
};
