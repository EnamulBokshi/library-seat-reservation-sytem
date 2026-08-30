import { z } from "zod";

const createLoanRequestSchema = z.object({
  body: z.object({
    bookId: z.string({
      error: "Book ID is required",
    }).uuid("Invalid Book ID"),
    notes: z.string().optional(),
  }),
});

const directIssueSchema = z.object({
  body: z.object({
    bookId: z.string({
      error: "Book ID is required",
    }).uuid("Invalid Book ID"),
    studentIdentifier: z.string({
      error: "Student ID or Email is required",
    }).min(1, "Student identifier cannot be empty"),
    dueDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional(),
  }),
});

const updateLoanStatusSchema = z.object({
  body: z.object({
    status: z.enum(["requested", "issued", "returned", "overdue", "cancelled", "rejected"], {
      error: "Valid status is required",
    }),
    notes: z.string().optional(),
  }),
});

const adminRenewSchema = z.object({
  body: z.object({
    extendedDays: z.number().int().min(1).max(60).optional(),
    notes: z.string().optional(),
  }),
});

export const LoanValidation = {
  createLoanRequestSchema,
  directIssueSchema,
  updateLoanStatusSchema,
  adminRenewSchema,
};
