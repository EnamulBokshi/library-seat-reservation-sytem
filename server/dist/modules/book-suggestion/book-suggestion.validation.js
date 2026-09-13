"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookSuggestionValidation = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../generated/enums");
const createSuggestionSchema = zod_1.z.object({
    title: zod_1.z.string({ error: "Book title is required" }).min(2, "Title must be at least 2 characters").trim(),
    author: zod_1.z.string({ error: "Author is required" }).min(2, "Author must be at least 2 characters").trim(),
    publisher: zod_1.z.string().trim().optional().nullable(),
    edition: zod_1.z.string().trim().optional().nullable(),
    isbn: zod_1.z.string().trim().optional().nullable(),
    department: zod_1.z.string().trim().optional().nullable(),
    courseCode: zod_1.z.string().trim().optional().nullable(),
    reason: zod_1.z.string().trim().optional().nullable(),
});
const fulfillSuggestionSchema = zod_1.z.object({
    bookId: zod_1.z.string().uuid("Invalid book UUID").optional().nullable(),
    createCatalogBook: zod_1.z.boolean().optional(),
    category: zod_1.z.string().trim().optional().nullable(),
    block: zod_1.z.string().trim().optional().nullable(),
    shelfNumber: zod_1.z.string().trim().optional().nullable(),
    rowNumber: zod_1.z.string().trim().optional().nullable(),
    callNumber: zod_1.z.string().trim().optional().nullable(),
    totalCopies: zod_1.z.coerce.number().int().positive().optional(),
    barcode: zod_1.z.string().trim().optional().nullable(),
    description: zod_1.z.string().trim().optional().nullable(),
    adminNotes: zod_1.z.string().trim().optional().nullable(),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(enums_1.SuggestionStatus),
    adminNotes: zod_1.z.string().trim().optional().nullable(),
});
exports.BookSuggestionValidation = {
    createSuggestionSchema,
    fulfillSuggestionSchema,
    updateStatusSchema,
};
