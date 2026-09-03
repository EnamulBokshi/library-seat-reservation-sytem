import { z } from "zod";

export const createZoneSchema = z.object({
    name: z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    rules: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

export const updateZoneSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    rules: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

export const ZoneValidation = {
    createZoneSchema,
    updateZoneSchema,
};
