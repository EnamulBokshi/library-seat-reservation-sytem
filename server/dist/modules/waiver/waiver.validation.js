"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiverValidation = exports.decideWaiverRequestSchema = exports.createWaiverRequestSchema = void 0;
const zod_1 = require("zod");
exports.createWaiverRequestSchema = zod_1.z
    .object({
    targetUserId: zod_1.z.string({ error: "The student is required" }).uuid("Invalid user id"),
    bookingId: zod_1.z.string().uuid("Invalid booking id").optional(),
    loanId: zod_1.z.string().uuid("Invalid loan id").optional(),
    reason: zod_1.z
        .string({ error: "A justification is required" })
        .min(10, "Explain the request in at least 10 characters"),
})
    .refine((data) => Boolean(data.bookingId) !== Boolean(data.loanId), {
    message: "Reference exactly one fine: either a seat booking or a book loan",
    path: ["bookingId"],
});
exports.decideWaiverRequestSchema = zod_1.z.object({
    status: zod_1.z.enum(["approved", "rejected"], { error: "Decision must be approved or rejected" }),
    decisionNote: zod_1.z.string().max(500, "Keep the note under 500 characters").optional(),
});
exports.WaiverValidation = {
    createWaiverRequestSchema: exports.createWaiverRequestSchema,
    decideWaiverRequestSchema: exports.decideWaiverRequestSchema,
};
