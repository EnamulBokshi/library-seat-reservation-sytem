"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementValidation = exports.updateAnnouncementSchema = exports.createAnnouncementSchema = void 0;
const zod_1 = require("zod");
const isoDate = zod_1.z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date",
});
exports.createAnnouncementSchema = zod_1.z.object({
    title: zod_1.z
        .string({ error: "A title is required" })
        .min(4, "Title must be at least 4 characters")
        .max(160, "Keep the title under 160 characters"),
    content: zod_1.z
        .string({ error: "A notice body is required" })
        .min(10, "Write at least 10 characters so the notice says something"),
    audience: zod_1.z.enum(["all", "students", "faculty", "staff"]).optional(),
    priority: zod_1.z.enum(["info", "important", "urgent"]).optional(),
    isPinned: zod_1.z.boolean().optional(),
    publishedAt: isoDate.optional(),
    expiresAt: isoDate.nullable().optional(),
});
exports.updateAnnouncementSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(4).max(160).optional(),
    content: zod_1.z.string().min(10).optional(),
    audience: zod_1.z.enum(["all", "students", "faculty", "staff"]).optional(),
    priority: zod_1.z.enum(["info", "important", "urgent"]).optional(),
    isPinned: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
    publishedAt: isoDate.optional(),
    expiresAt: isoDate.nullable().optional(),
})
    .refine((data) => Object.keys(data).length > 0, {
    message: "Send at least one field to update",
});
exports.AnnouncementValidation = {
    createAnnouncementSchema: exports.createAnnouncementSchema,
    updateAnnouncementSchema: exports.updateAnnouncementSchema,
};
