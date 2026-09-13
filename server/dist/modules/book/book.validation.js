"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookValidation = void 0;
const zod_1 = require("zod");
const createBookSchema = zod_1.z.object({
    title: zod_1.z.string({
        error: "Book title is required",
    }).min(1, "Title cannot be empty"),
    author: zod_1.z.string({
        error: "Author is required",
    }).min(1, "Author cannot be empty"),
    isbn: zod_1.z.string().optional().nullable(),
    barcode: zod_1.z.string().optional().nullable(),
    category: zod_1.z.string().default("General"),
    publisher: zod_1.z.string().optional().nullable(),
    publicationYear: zod_1.z.coerce.number().int().optional().nullable(),
    edition: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    coverImage: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal("")),
    pdfUrl: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal("")),
    totalCopies: zod_1.z.coerce.number().int().min(1).default(1),
    availableCopies: zod_1.z.coerce.number().int().min(0).optional(),
    block: zod_1.z.string({
        error: "Spatial location block is required (e.g. Block A, Main Hall)",
    }).min(1, "Block cannot be empty"),
    shelfNumber: zod_1.z.string({
        error: "Shelf number is required (e.g. Shelf 04)",
    }).min(1, "Shelf number cannot be empty"),
    rowNumber: zod_1.z.string().optional().nullable(),
    callNumber: zod_1.z.string().optional().nullable(),
});
const updateBookSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    author: zod_1.z.string().min(1).optional(),
    isbn: zod_1.z.string().optional().nullable(),
    barcode: zod_1.z.string().optional().nullable(),
    category: zod_1.z.string().optional(),
    publisher: zod_1.z.string().optional().nullable(),
    publicationYear: zod_1.z.coerce.number().int().optional().nullable(),
    edition: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    coverImage: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal("")),
    pdfUrl: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal("")),
    totalCopies: zod_1.z.coerce.number().int().min(1).optional(),
    availableCopies: zod_1.z.coerce.number().int().min(0).optional(),
    block: zod_1.z.string().min(1).optional(),
    shelfNumber: zod_1.z.string().min(1).optional(),
    rowNumber: zod_1.z.string().optional().nullable(),
    callNumber: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.coerce.boolean().optional(),
});
exports.BookValidation = {
    createBookSchema,
    updateBookSchema,
};
