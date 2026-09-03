"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneValidation = exports.updateZoneSchema = exports.createZoneSchema = void 0;
const zod_1 = require("zod");
const zoneTypeEnum = zod_1.z.enum([
    "silent_desk",
    "group_study",
    "computer_lab",
    "open_reading",
    "conference_room",
]);
const tableTypeEnum = zod_1.z.enum([
    "individual_cubicle",
    "circle_table",
    "meeting_table",
    "booth_pod",
    "workstation_bench",
]);
exports.createZoneSchema = zod_1.z.object({
    name: zod_1.z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    description: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    zoneType: zoneTypeEnum.optional(),
    allowMultiSeat: zod_1.z.boolean().optional(),
    maxSeatsPerBooking: zod_1.z.number().int().min(1).max(20).optional(),
    defaultTableType: tableTypeEnum.optional(),
    rules: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateZoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").optional(),
    description: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    zoneType: zoneTypeEnum.optional(),
    allowMultiSeat: zod_1.z.boolean().optional(),
    maxSeatsPerBooking: zod_1.z.number().int().min(1).max(20).optional(),
    defaultTableType: tableTypeEnum.optional(),
    rules: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.ZoneValidation = {
    createZoneSchema: exports.createZoneSchema,
    updateZoneSchema: exports.updateZoneSchema,
};
