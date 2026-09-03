import { z } from "zod";

const createLoanRequestSchema = z.object({
  bookId: z.string({
    error: "Book ID is required",
  }).uuid("Invalid Book ID"),
  notes: z.string().optional(),
});

const directIssueSchema = z.object({
  bookIdentifier: z.string({
    error: "Book Barcode, ISBN or ID is required",
  }).min(1, "Book identifier cannot be empty"),
  studentIdentifier: z.string({
    error: "Student ID or Email is required",
  }).min(1, "Student identifier cannot be empty"),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

const updateLoanStatusSchema = z.object({
  status: z.enum(["requested", "issued", "returned", "overdue", "cancelled", "rejected"], {
    error: "Valid status is required",
  }),
  notes: z.string().optional(),
});

const adminRenewSchema = z.object({
  extendedDays: z.coerce.number().int().min(1).max(60).optional(),
  notes: z.string().optional(),
});

const payFineSchema = z.object({
  paymentMethod: z.enum(["cash", "chalan", "online"], {
    error: "Payment method must be cash, chalan, or online",
  }),
  chalanNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const LoanValidation = {
  createLoanRequestSchema,
  directIssueSchema,
  updateLoanStatusSchema,
  adminRenewSchema,
  payFineSchema,
};
