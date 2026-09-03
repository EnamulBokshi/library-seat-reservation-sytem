import { z } from "zod";

const tableTypeEnum = z.enum([
    "individual_cubicle",
    "circle_table",
    "meeting_table",
    "booth_pod",
    "workstation_bench",
]);

export const createSeatSchema = z.object({
    seatNumber: z.string({ error: "Seat number is required" }).min(1, "Seat number cannot be empty"),
    tableNumber: z.string().optional(),
    tableType: tableTypeEnum.optional(),
    tableCapacity: z.number().int().min(1).optional(),
    seatPosition: z.number().int().min(1).optional(),
});

export const createTableClusterSchema = z.object({
    tableNumber: z.string({ error: "Table number is required" }).min(1, "Table number cannot be empty"),
    tableType: tableTypeEnum,
    chairCount: z.number().int().min(1, "Chair count must be at least 1").max(30, "Chair count cannot exceed 30"),
    prefix: z.string().optional(),
});

export const bulkCreateTablesSchema = z.object({
    tableType: tableTypeEnum,
    tableCount: z.number().int().min(1, "Must create at least 1 table").max(50, "Cannot create more than 50 tables at once"),
    chairsPerTable: z.number().int().min(1, "Each table must have at least 1 chair").max(20, "Max 20 chairs per table"),
    tablePrefix: z.string().optional(),
    startTableNumber: z.number().int().min(1).optional(),
});

export const updateSeatSchema = z.object({
    seatNumber: z.string().min(1, "Seat number cannot be empty").optional(),
    tableNumber: z.string().nullable().optional(),
    tableType: tableTypeEnum.optional(),
    tableCapacity: z.number().int().min(1).nullable().optional(),
    seatPosition: z.number().int().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
    isOccupied: z.boolean().optional(),
});

export const SeatValidation = {
    createSeatSchema,
    createTableClusterSchema,
    bulkCreateTablesSchema,
    updateSeatSchema,
};
