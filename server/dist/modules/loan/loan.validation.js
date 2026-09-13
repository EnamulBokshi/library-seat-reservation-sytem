"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanValidation = void 0;
const zod_1 = require("zod");
const createLoanRequestSchema = zod_1.z.object({
    bookId: zod_1.z.string({
        error: "Book ID is required",
    }).uuid("Invalid Book ID"),
    notes: zod_1.z.string().optional(),
});
const directIssueSchema = zod_1.z.object({
    bookIdentifier: zod_1.z.string({
        error: "Book Barcode, ISBN or ID is required",
    }).min(1, "Book identifier cannot be empty"),
    studentIdentifier: zod_1.z.string({
        error: "Student ID or Email is required",
    }).min(1, "Student identifier cannot be empty"),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    notes: zod_1.z.string().optional(),
});
const updateLoanStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["requested", "issued", "returned", "overdue", "cancelled", "rejected"], {
        error: "Valid status is required",
    }),
    notes: zod_1.z.string().optional(),
});
const adminRenewSchema = zod_1.z.object({
    extendedDays: zod_1.z.coerce.number().int().min(1).max(60).optional(),
    notes: zod_1.z.string().optional(),
});
const payFineSchema = zod_1.z.object({
    paymentMethod: zod_1.z.enum(["cash", "chalan", "online"], {
        error: "Payment method must be cash, chalan, or online",
    }),
    chalanNumber: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.LoanValidation = {
    createLoanRequestSchema,
    directIssueSchema,
    updateLoanStatusSchema,
    adminRenewSchema,
    payFineSchema,
};
