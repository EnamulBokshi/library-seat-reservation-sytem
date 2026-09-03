import { z } from "zod";

export const createBookingSchema = z.object({
    seatId: z.string({ error: "Seat ID is required" }).uuid("Invalid Seat ID format"),
    scheduleId: z.string({ error: "Schedule ID is required" }).uuid("Invalid Schedule ID format"),
});

export const BookingValidation = {
    createBookingSchema,
};
