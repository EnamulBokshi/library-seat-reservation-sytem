import { z } from "zod";

const CATEGORIES = ["bug", "service", "facilities", "environment", "book", "other"] as const;
const PRIORITIES = ["low", "normal", "high"] as const;

export const createReportSchema = z.object({
    category: z.enum(CATEGORIES, { error: "Choose what the report is about" }),
    subject: z
        .string({ error: "A subject is required" })
        .min(4, "Subject must be at least 4 characters")
        .max(160, "Keep the subject under 160 characters"),
    description: z
        .string({ error: "A description is required" })
        .min(15, "Describe the issue in at least 15 characters"),
    priority: z.enum(PRIORITIES).optional(),
    location: z.string().max(160, "Keep the location under 160 characters").optional(),
});

export const updateReportStatusSchema = z.object({
    status: z.enum(["open", "in_review", "resolved", "dismissed"], {
        error: "Choose a valid status",
    }),
    staffNote: z.string().max(2000, "Keep the note under 2000 characters").optional(),
    priority: z.enum(PRIORITIES).optional(),
});

export const ReportValidation = {
    createReportSchema,
    updateReportStatusSchema,
};
