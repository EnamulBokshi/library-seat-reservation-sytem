import { z } from "zod";

const createBookSchema = z.object({
  body: z.object({
    title: z.string({
      error: "Book title is required",
    }).min(1, "Title cannot be empty"),
    author: z.string({
      error: "Author is required",
    }).min(1, "Author cannot be empty"),
    isbn: z.string().optional().nullable(),
    category: z.string().default("General"),
    publisher: z.string().optional().nullable(),
    publicationYear: z.number().int().optional().nullable(),
    edition: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    coverImage: z.string().url().optional().nullable().or(z.literal("")),
    pdfUrl: z.string().url().optional().nullable().or(z.literal("")),
    totalCopies: z.number().int().min(1).default(1),
    availableCopies: z.number().int().min(0).optional(),
    block: z.string({
      error: "Spatial location block is required (e.g. Block A, Main Hall)",
    }).min(1, "Block cannot be empty"),
    shelfNumber: z.string({
      error: "Shelf number is required (e.g. Shelf 04)",
    }).min(1, "Shelf number cannot be empty"),
    rowNumber: z.string().optional().nullable(),
    callNumber: z.string().optional().nullable(),
  }),
});

const updateBookSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    author: z.string().min(1).optional(),
    isbn: z.string().optional().nullable(),
    category: z.string().optional(),
    publisher: z.string().optional().nullable(),
    publicationYear: z.number().int().optional().nullable(),
    edition: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    coverImage: z.string().url().optional().nullable().or(z.literal("")),
    pdfUrl: z.string().url().optional().nullable().or(z.literal("")),
    totalCopies: z.number().int().min(1).optional(),
    availableCopies: z.number().int().min(0).optional(),
    block: z.string().min(1).optional(),
    shelfNumber: z.string().min(1).optional(),
    rowNumber: z.string().optional().nullable(),
    callNumber: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const BookValidation = {
  createBookSchema,
  updateBookSchema,
};
