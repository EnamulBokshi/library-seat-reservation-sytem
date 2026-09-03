import { z } from "zod";

const zoneTypeEnum = z.enum([
    "silent_desk",
    "group_study",
    "computer_lab",
    "open_reading",
    "conference_room",
]);

const tableTypeEnum = z.enum([
    "individual_cubicle",
    "circle_table",
    "meeting_table",
    "booth_pod",
    "workstation_bench",
]);

export const createZoneSchema = z.object({
    name: z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    zoneType: zoneTypeEnum.optional(),
    allowMultiSeat: z.boolean().optional(),
    maxSeatsPerBooking: z.number().int().min(1).max(20).optional(),
    defaultTableType: tableTypeEnum.optional(),
    rules: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

export const updateZoneSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    zoneType: zoneTypeEnum.optional(),
    allowMultiSeat: z.boolean().optional(),
    maxSeatsPerBooking: z.number().int().min(1).max(20).optional(),
    defaultTableType: tableTypeEnum.optional(),
    rules: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

export const ZoneValidation = {
    createZoneSchema,
    updateZoneSchema,
};
