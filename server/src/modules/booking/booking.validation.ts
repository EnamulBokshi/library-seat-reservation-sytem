import { z } from "zod";

export const createBookingSchema = z
    .object({
        seatId: z.string().uuid("Invalid Seat ID format").optional(),
        seatIds: z.array(z.string().uuid("Invalid Seat ID format")).min(1, "At least one seat must be selected").optional(),
        scheduleId: z.string({ error: "Schedule ID is required" }).uuid("Invalid Schedule ID format"),
        guestCount: z.number().int().min(1).optional(),
        tableNumber: z.string().optional(),
    })
    .refine((data) => data.seatId || (data.seatIds && data.seatIds.length > 0), {
        message: "Either seatId or seatIds array must be provided",
        path: ["seatId"],
    });

export const fcfsQuickAssignSchema = z.object({
    zoneId: z.string({ error: "Zone ID is required" }).uuid("Invalid Zone ID format"),
    scheduleId: z.string({ error: "Schedule ID is required" }).uuid("Invalid Schedule ID format"),
    partySize: z.number().int().min(1).max(20).optional(),
});

export const paySeatFineSchema = z.object({
    paymentMethod: z.enum(["cash", "chalan", "online"], {
        error: "Payment method must be cash, chalan, or online",
    }),
    chalanNumber: z.string().optional(),
    notes: z.string().optional(),
});

export const waiveSeatFineSchema = z.object({
    reason: z.string().max(500, "Waiver reason must be 500 characters or fewer").optional(),
});

export const BookingValidation = {
    createBookingSchema,
    fcfsQuickAssignSchema,
    paySeatFineSchema,
    waiveSeatFineSchema,
};
