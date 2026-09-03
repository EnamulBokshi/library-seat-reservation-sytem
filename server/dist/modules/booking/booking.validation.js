"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingValidation = exports.fcfsQuickAssignSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
exports.createBookingSchema = zod_1.z
    .object({
    seatId: zod_1.z.string().uuid("Invalid Seat ID format").optional(),
    seatIds: zod_1.z.array(zod_1.z.string().uuid("Invalid Seat ID format")).min(1, "At least one seat must be selected").optional(),
    scheduleId: zod_1.z.string({ error: "Schedule ID is required" }).uuid("Invalid Schedule ID format"),
    guestCount: zod_1.z.number().int().min(1).optional(),
    tableNumber: zod_1.z.string().optional(),
})
    .refine((data) => data.seatId || (data.seatIds && data.seatIds.length > 0), {
    message: "Either seatId or seatIds array must be provided",
    path: ["seatId"],
});
exports.fcfsQuickAssignSchema = zod_1.z.object({
    zoneId: zod_1.z.string({ error: "Zone ID is required" }).uuid("Invalid Zone ID format"),
    scheduleId: zod_1.z.string({ error: "Schedule ID is required" }).uuid("Invalid Schedule ID format"),
    partySize: zod_1.z.number().int().min(1).max(20).optional(),
});
exports.BookingValidation = {
    createBookingSchema: exports.createBookingSchema,
    fcfsQuickAssignSchema: exports.fcfsQuickAssignSchema,
};
