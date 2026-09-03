"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatValidation = exports.updateSeatSchema = exports.bulkCreateTablesSchema = exports.createTableClusterSchema = exports.createSeatSchema = void 0;
const zod_1 = require("zod");
const tableTypeEnum = zod_1.z.enum([
    "individual_cubicle",
    "circle_table",
    "meeting_table",
    "booth_pod",
    "workstation_bench",
]);
exports.createSeatSchema = zod_1.z.object({
    seatNumber: zod_1.z.string({ error: "Seat number is required" }).min(1, "Seat number cannot be empty"),
    tableNumber: zod_1.z.string().optional(),
    tableType: tableTypeEnum.optional(),
    tableCapacity: zod_1.z.number().int().min(1).optional(),
    seatPosition: zod_1.z.number().int().min(1).optional(),
});
exports.createTableClusterSchema = zod_1.z.object({
    tableNumber: zod_1.z.string({ error: "Table number is required" }).min(1, "Table number cannot be empty"),
    tableType: tableTypeEnum,
    chairCount: zod_1.z.number().int().min(1, "Chair count must be at least 1").max(30, "Chair count cannot exceed 30"),
    prefix: zod_1.z.string().optional(),
});
exports.bulkCreateTablesSchema = zod_1.z.object({
    tableType: tableTypeEnum,
    tableCount: zod_1.z.number().int().min(1, "Must create at least 1 table").max(50, "Cannot create more than 50 tables at once"),
    chairsPerTable: zod_1.z.number().int().min(1, "Each table must have at least 1 chair").max(20, "Max 20 chairs per table"),
    tablePrefix: zod_1.z.string().optional(),
    startTableNumber: zod_1.z.number().int().min(1).optional(),
});
exports.updateSeatSchema = zod_1.z.object({
    seatNumber: zod_1.z.string().min(1, "Seat number cannot be empty").optional(),
    tableNumber: zod_1.z.string().nullable().optional(),
    tableType: tableTypeEnum.optional(),
    tableCapacity: zod_1.z.number().int().min(1).nullable().optional(),
    seatPosition: zod_1.z.number().int().min(1).nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    isOccupied: zod_1.z.boolean().optional(),
});
exports.SeatValidation = {
    createSeatSchema: exports.createSeatSchema,
    createTableClusterSchema: exports.createTableClusterSchema,
    bulkCreateTablesSchema: exports.bulkCreateTablesSchema,
    updateSeatSchema: exports.updateSeatSchema,
};
