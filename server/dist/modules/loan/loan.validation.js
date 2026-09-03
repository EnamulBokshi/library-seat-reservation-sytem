"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanValidation = void 0;
const zod_1 = require("zod");
const createLoanRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        bookId: zod_1.z.string({
            error: "Book ID is required",
        }).uuid("Invalid Book ID"),
        notes: zod_1.z.string().optional(),
    }),
});
const directIssueSchema = zod_1.z.object({
    body: zod_1.z.object({
        bookId: zod_1.z.string({
            error: "Book ID is required",
        }).uuid("Invalid Book ID"),
        studentIdentifier: zod_1.z.string({
            error: "Student ID or Email is required",
        }).min(1, "Student identifier cannot be empty"),
        dueDate: zod_1.z.string().datetime().optional().nullable(),
        notes: zod_1.z.string().optional(),
    }),
});
const updateLoanStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(["requested", "issued", "returned", "overdue", "cancelled", "rejected"], {
            error: "Valid status is required",
        }),
        notes: zod_1.z.string().optional(),
    }),
});
const adminRenewSchema = zod_1.z.object({
    body: zod_1.z.object({
        extendedDays: zod_1.z.number().int().min(1).max(60).optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.LoanValidation = {
    createLoanRequestSchema,
    directIssueSchema,
    updateLoanStatusSchema,
    adminRenewSchema,
};
