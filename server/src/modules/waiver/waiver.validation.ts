import { z } from "zod";

export const createWaiverRequestSchema = z
    .object({
        targetUserId: z.string({ error: "The student is required" }).uuid("Invalid user id"),
        bookingId: z.string().uuid("Invalid booking id").optional(),
        loanId: z.string().uuid("Invalid loan id").optional(),
        reason: z
            .string({ error: "A justification is required" })
            .min(10, "Explain the request in at least 10 characters"),
    })
    .refine((data) => Boolean(data.bookingId) !== Boolean(data.loanId), {
        message: "Reference exactly one fine: either a seat booking or a book loan",
        path: ["bookingId"],
    });

export const decideWaiverRequestSchema = z.object({
    status: z.enum(["approved", "rejected"], { error: "Decision must be approved or rejected" }),
    decisionNote: z.string().max(500, "Keep the note under 500 characters").optional(),
});

export const WaiverValidation = {
    createWaiverRequestSchema,
    decideWaiverRequestSchema,
};
