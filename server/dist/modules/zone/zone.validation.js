"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneValidation = exports.updateZoneSchema = exports.createZoneSchema = void 0;
const zod_1 = require("zod");
exports.createZoneSchema = zod_1.z.object({
    name: zod_1.z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    description: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    rules: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateZoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").optional(),
    description: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid 6-character hex string (e.g. #4F46E5)").optional(),
    rules: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.ZoneValidation = {
    createZoneSchema: exports.createZoneSchema,
    updateZoneSchema: exports.updateZoneSchema,
};
