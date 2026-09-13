import { z } from "zod";
import { SuggestionStatus } from "../../generated/enums";

const createSuggestionSchema = z.object({
  title: z.string({ error: "Book title is required" }).min(2, "Title must be at least 2 characters").trim(),
  author: z.string({ error: "Author is required" }).min(2, "Author must be at least 2 characters").trim(),
  publisher: z.string().trim().optional().nullable(),
  edition: z.string().trim().optional().nullable(),
  isbn: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  courseCode: z.string().trim().optional().nullable(),
  reason: z.string().trim().optional().nullable(),
});

const fulfillSuggestionSchema = z.object({
  bookId: z.string().uuid("Invalid book UUID").optional().nullable(),
  createCatalogBook: z.boolean().optional(),
  category: z.string().trim().optional().nullable(),
  block: z.string().trim().optional().nullable(),
  shelfNumber: z.string().trim().optional().nullable(),
  rowNumber: z.string().trim().optional().nullable(),
  callNumber: z.string().trim().optional().nullable(),
  totalCopies: z.coerce.number().int().positive().optional(),
  barcode: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  adminNotes: z.string().trim().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(SuggestionStatus),
  adminNotes: z.string().trim().optional().nullable(),
});

export const BookSuggestionValidation = {
  createSuggestionSchema,
  fulfillSuggestionSchema,
  updateStatusSchema,
};
