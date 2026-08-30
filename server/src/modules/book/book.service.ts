import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import status from "http-status";
import { IBookFilterOptions, ICreateBookPayload, IUpdateBookPayload } from "./book.interface";
import { Prisma } from "../../generated/client";

/**
 * Create a new book record (Admin / Librarian)
 */
const createBook = async (payload: ICreateBookPayload) => {
  const { totalCopies = 1 } = payload;
  const availableCopies = payload.availableCopies ?? totalCopies;

  // If ISBN is provided, check uniqueness
  if (payload.isbn) {
    const existing = await prisma.book.findFirst({
      where: { isbn: payload.isbn, isActive: true },
    });
    if (existing) {
      throw new AppError(status.CONFLICT, `A book with ISBN ${payload.isbn} already exists.`);
    }
  }

  // If Barcode is provided, check uniqueness
  if (payload.barcode) {
    const existingBarcode = await prisma.book.findFirst({
      where: { barcode: payload.barcode, isActive: true },
    });
    if (existingBarcode) {
      throw new AppError(status.CONFLICT, `A book with Barcode ${payload.barcode} already exists.`);
    }
  }

  const book = await prisma.book.create({
    data: {
      ...payload,
      totalCopies,
      availableCopies,
    },
  });

  return book;
};

/**
 * Get all books with search, filter, and pagination
 */
const getAllBooks = async (options: IBookFilterOptions) => {
  const {
    searchTerm,
    category,
    block,
    shelfNumber,
    hasPdf,
    inStockOnly,
    showInactive = false,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const skip = (page - 1) * limit;

  const whereConditions: Prisma.BookWhereInput[] = [];

  if (!showInactive) {
    whereConditions.push({ isActive: true });
  }

  if (searchTerm) {
    whereConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { author: { contains: searchTerm, mode: "insensitive" } },
        { isbn: { contains: searchTerm, mode: "insensitive" } },
        { barcode: { contains: searchTerm, mode: "insensitive" } },
        { category: { contains: searchTerm, mode: "insensitive" } },
        { callNumber: { contains: searchTerm, mode: "insensitive" } },
        { publisher: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (category && category !== "All") {
    whereConditions.push({ category: { equals: category, mode: "insensitive" } });
  }

  if (block && block !== "All") {
    whereConditions.push({ block: { equals: block, mode: "insensitive" } });
  }

  if (shelfNumber && shelfNumber !== "All") {
    whereConditions.push({ shelfNumber: { equals: shelfNumber, mode: "insensitive" } });
  }

  if (hasPdf) {
    whereConditions.push({
      pdfUrl: { not: null },
      AND: [{ pdfUrl: { not: "" } }],
    });
  }

  if (inStockOnly) {
    whereConditions.push({ availableCopies: { gt: 0 } });
  }

  const where: Prisma.BookWhereInput = whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.book.count({ where }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: books,
  };
};

/**
 * Get book by ID
 */
const getBookById = async (id: string) => {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      loans: {
        where: {
          status: { in: ["requested", "issued"] },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
            },
          },
        },
      },
    },
  });

  if (!book) {
    throw new AppError(status.NOT_FOUND, "Book not found");
  }

  return book;
};

/**
 * Update book details
 */
const updateBook = async (id: string, payload: IUpdateBookPayload) => {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw new AppError(status.NOT_FOUND, "Book not found");
  }

  if (payload.isbn && payload.isbn !== book.isbn) {
    const existing = await prisma.book.findFirst({
      where: { isbn: payload.isbn, id: { not: id } },
    });
    if (existing) {
      throw new AppError(status.CONFLICT, `A book with ISBN ${payload.isbn} already exists.`);
    }
  }

  // Adjust availableCopies if totalCopies is modified
  let availableCopies = payload.availableCopies;
  if (payload.totalCopies !== undefined && availableCopies === undefined) {
    const copyDifference = payload.totalCopies - book.totalCopies;
    availableCopies = Math.max(0, book.availableCopies + copyDifference);
  }

  const updated = await prisma.book.update({
    where: { id },
    data: {
      ...payload,
      availableCopies,
    },
  });

  return updated;
};

/**
 * Soft delete / deactivate a book
 */
const deleteBook = async (id: string) => {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw new AppError(status.NOT_FOUND, "Book not found");
  }

  // Check if there are active loans
  const activeLoans = await prisma.bookLoan.count({
    where: {
      bookId: id,
      status: { in: ["issued", "overdue"] },
    },
  });

  if (activeLoans > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete book while copies are currently issued or on loan."
    );
  }

  const deleted = await prisma.book.update({
    where: { id },
    data: { isActive: false },
  });

  return deleted;
};

/**
 * Get distinct categories list
 */
const getCategories = async () => {
  const categories = await prisma.book.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ["category"],
  });

  return categories.map((c) => c.category).filter(Boolean);
};

/**
 * Get distinct blocks and shelves for filtering
 */
const getSpatialIndex = async () => {
  const books = await prisma.book.findMany({
    where: { isActive: true },
    select: { block: true, shelfNumber: true },
    distinct: ["block", "shelfNumber"],
  });

  const blocks = Array.from(new Set(books.map((b) => b.block)));
  const shelves = Array.from(new Set(books.map((b) => b.shelfNumber)));

  return { blocks, shelves };
};

export const BookService = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getCategories,
  getSpatialIndex,
};
