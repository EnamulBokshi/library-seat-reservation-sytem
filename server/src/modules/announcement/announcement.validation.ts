import { z } from "zod";

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date",
});

export const createAnnouncementSchema = z.object({
    title: z
        .string({ error: "A title is required" })
        .min(4, "Title must be at least 4 characters")
        .max(160, "Keep the title under 160 characters"),
    content: z
        .string({ error: "A notice body is required" })
        .min(10, "Write at least 10 characters so the notice says something"),
    audience: z.enum(["all", "students", "faculty", "staff"]).optional(),
    priority: z.enum(["info", "important", "urgent"]).optional(),
    isPinned: z.boolean().optional(),
    publishedAt: isoDate.optional(),
    expiresAt: isoDate.nullable().optional(),
});

export const updateAnnouncementSchema = z
    .object({
        title: z.string().min(4).max(160).optional(),
        content: z.string().min(10).optional(),
        audience: z.enum(["all", "students", "faculty", "staff"]).optional(),
        priority: z.enum(["info", "important", "urgent"]).optional(),
        isPinned: z.boolean().optional(),
        isActive: z.boolean().optional(),
        publishedAt: isoDate.optional(),
        expiresAt: isoDate.nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Send at least one field to update",
    });

export const AnnouncementValidation = {
    createAnnouncementSchema,
    updateAnnouncementSchema,
};
