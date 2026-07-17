import { z } from "zod";

export const createSeatSchema = z.object({
    seatNumber: z.string({ error: "Seat number is required" }).min(1, "Seat number cannot be empty"),
});

export const updateSeatSchema = z.object({
    seatNumber: z.string().min(1, "Seat number cannot be empty").optional(),
    isActive: z.boolean().optional(),
    isOccupied: z.boolean().optional(),
});

export const SeatValidation = {
    createSeatSchema,
    updateSeatSchema,
};
