"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportValidation = exports.updateReportStatusSchema = exports.createReportSchema = void 0;
const zod_1 = require("zod");
const CATEGORIES = ["bug", "service", "facilities", "environment", "book", "other"];
const PRIORITIES = ["low", "normal", "high"];
exports.createReportSchema = zod_1.z.object({
    category: zod_1.z.enum(CATEGORIES, { error: "Choose what the report is about" }),
    subject: zod_1.z
        .string({ error: "A subject is required" })
        .min(4, "Subject must be at least 4 characters")
        .max(160, "Keep the subject under 160 characters"),
    description: zod_1.z
        .string({ error: "A description is required" })
        .min(15, "Describe the issue in at least 15 characters"),
    priority: zod_1.z.enum(PRIORITIES).optional(),
    location: zod_1.z.string().max(160, "Keep the location under 160 characters").optional(),
});
exports.updateReportStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["open", "in_review", "resolved", "dismissed"], {
        error: "Choose a valid status",
    }),
    staffNote: zod_1.z.string().max(2000, "Keep the note under 2000 characters").optional(),
    priority: zod_1.z.enum(PRIORITIES).optional(),
});
exports.ReportValidation = {
    createReportSchema: exports.createReportSchema,
    updateReportStatusSchema: exports.updateReportStatusSchema,
};
