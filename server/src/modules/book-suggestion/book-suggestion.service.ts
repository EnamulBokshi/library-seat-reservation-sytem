import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import status from "http-status";
import { SuggestionStatus, Role } from "../../generated/enums";
import {
  ICreateBookSuggestionPayload,
  ISuggestionFilterOptions,
  IFulfillSuggestionPayload,
  IUpdateSuggestionStatusPayload,
} from "./book-suggestion.interface";
import { emailService } from "../../services/email.service";

/**
 * Submit a new book recommendation (Faculty only).
 * Automatically casts 1 initial upvote by the proposing faculty member.
 */
const createSuggestion = async (userId: string, payload: ICreateBookSuggestionPayload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, department: true },
  });

  if (!user || user.role !== Role.faculty) {
    throw new AppError(status.FORBIDDEN, "Only faculty members may submit book suggestions.");
  }

  // Create suggestion and initial vote in transaction
  const result = await prisma.$transaction(async (tx) => {
    const suggestion = await tx.bookSuggestion.create({
      data: {
        userId,
        title: payload.title.trim(),
        author: payload.author.trim(),
        publisher: payload.publisher?.trim() || null,
        edition: payload.edition?.trim() || null,
        isbn: payload.isbn?.trim() || null,
        department: payload.department?.trim() || user.department || null,
        courseCode: payload.courseCode?.trim() || null,
        reason: payload.reason?.trim() || null,
        status: SuggestionStatus.pending,
        upvoteCount: 1,
      },
    });

    await tx.bookSuggestionVote.create({
      data: {
        suggestionId: suggestion.id,
        userId,
      },
    });

    return suggestion;
  });

  return result;
};

/**
 * Get all book suggestions with filters, search, and upvote ranking.
 */
const getSuggestions = async (viewerUserId: string, options: ISuggestionFilterOptions) => {
  const {
    searchTerm,
    status: filterStatus,
    department,
    onlyMySuggestions,
    page = 1,
    limit = 20,
    sortBy = "upvoteCount",
    sortOrder = "desc",
  } = options;

  const whereClause: any = {};

  // Status Filter
  if (filterStatus && filterStatus !== "all") {
    whereClause.status = filterStatus;
  }

  // Department Filter
  if (department) {
    whereClause.department = { equals: department, mode: "insensitive" };
  }

  // Author filter
  if (onlyMySuggestions) {
    whereClause.userId = viewerUserId;
  }

  // Search Filter
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim();
    whereClause.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { author: { contains: term, mode: "insensitive" } },
      { publisher: { contains: term, mode: "insensitive" } },
      { isbn: { contains: term, mode: "insensitive" } },
      { courseCode: { contains: term, mode: "insensitive" } },
      { department: { contains: term, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, suggestions] = await Promise.all([
    prisma.bookSuggestion.count({ where: whereClause }),
    prisma.bookSuggestion.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            facultyId: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            block: true,
            shelfNumber: true,
            callNumber: true,
            availableCopies: true,
            totalCopies: true,
          },
        },
        votes: {
          where: { userId: viewerUserId },
          select: { id: true },
        },
      },
      skip,
      take: limit,
      orderBy: [
        { [sortBy]: sortOrder },
        { createdAt: "desc" },
      ],
    }),
  ]);

  // Transform data to attach hasUpvoted flag cleanly
  const transformedData = suggestions.map((s) => {
    const hasUpvoted = s.votes.length > 0;
    const { votes, ...rest } = s;
    return {
      ...rest,
      hasUpvoted,
    };
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
};

/**
 * Toggle upvote on a book suggestion (Faculty only).
 */
const toggleVote = async (userId: string, suggestionId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== Role.faculty) {
    throw new AppError(status.FORBIDDEN, "Only faculty members may upvote book suggestions.");
  }

  const suggestion = await prisma.bookSuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion) {
    throw new AppError(status.NOT_FOUND, "Book suggestion not found.");
  }

  const existingVote = await prisma.bookSuggestionVote.findUnique({
    where: {
      suggestionId_userId: {
        suggestionId,
        userId,
      },
    },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existingVote) {
      // Remove vote
      await tx.bookSuggestionVote.delete({
        where: { id: existingVote.id },
      });

      const updated = await tx.bookSuggestion.update({
        where: { id: suggestionId },
        data: {
          upvoteCount: { decrement: 1 },
        },
      });

      return {
        hasUpvoted: false,
        upvoteCount: Math.max(0, updated.upvoteCount),
      };
    } else {
      // Add vote
      await tx.bookSuggestionVote.create({
        data: {
          suggestionId,
          userId,
        },
      });

      const updated = await tx.bookSuggestion.update({
        where: { id: suggestionId },
        data: {
          upvoteCount: { increment: 1 },
        },
      });

      return {
        hasUpvoted: true,
        upvoteCount: updated.upvoteCount,
      };
    }
  });

  return result;
};

/**
 * Fulfill a suggestion: add to catalog and dispatch formal DIU letter of gratitude (Admin / Librarian)
 */
const fulfillSuggestion = async (adminId: string, suggestionId: string, payload: IFulfillSuggestionPayload) => {
  const suggestion = await prisma.bookSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      user: true,
      book: true,
    },
  });

  if (!suggestion) {
    throw new AppError(status.NOT_FOUND, "Book suggestion not found.");
  }

  if (suggestion.status === SuggestionStatus.fulfilled) {
    throw new AppError(status.BAD_REQUEST, "This book suggestion is already marked as fulfilled.");
  }

  let finalBookId: string | null = payload.bookId || null;
  let finalBlock: string | null = payload.block || null;
  let finalShelf: string | null = payload.shelfNumber || null;
  let finalCallNumber: string | null = payload.callNumber || null;

  // Option A: Admin creates a new book record right from the suggestion
  if (payload.createCatalogBook || (payload.block && payload.shelfNumber && !payload.bookId)) {
    const newBook = await prisma.book.create({
      data: {
        title: suggestion.title,
        author: suggestion.author,
        publisher: suggestion.publisher || payload.category || "University Press",
        edition: suggestion.edition || null,
        isbn: suggestion.isbn || null,
        barcode: payload.barcode || `SUGG-${Date.now().toString().slice(-6)}`,
        category: payload.category || "General Academic",
        block: payload.block || "Block A",
        shelfNumber: payload.shelfNumber || "Shelf 01",
        rowNumber: payload.rowNumber || null,
        callNumber: payload.callNumber || null,
        description: payload.description || suggestion.reason || "Procured from faculty recommendation",
        totalCopies: payload.totalCopies || 1,
        availableCopies: payload.totalCopies || 1,
        isActive: true,
      },
    });

    finalBookId = newBook.id;
    finalBlock = newBook.block;
    finalShelf = newBook.shelfNumber;
    finalCallNumber = newBook.callNumber;
  } else if (payload.bookId) {
    const existingBook = await prisma.book.findUnique({
      where: { id: payload.bookId },
    });
    if (existingBook) {
      finalBlock = existingBook.block;
      finalShelf = existingBook.shelfNumber;
      finalCallNumber = existingBook.callNumber;
    }
  }

  // Update suggestion status
  const updatedSuggestion = await prisma.bookSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: SuggestionStatus.fulfilled,
      fulfilledAt: new Date(),
      fulfilledById: adminId,
      bookId: finalBookId,
      adminNotes: payload.adminNotes || "Procured and added to library collection.",
    },
    include: {
      user: true,
      book: true,
    },
  });

  // Dispatch formal DIU gratitude email to faculty member
  if (suggestion.user?.email) {
    try {
      await emailService.sendBookSuggestionFulfilledEmail({
        facultyName: suggestion.user.name,
        facultyEmail: suggestion.user.email,
        bookTitle: suggestion.title,
        author: suggestion.author,
        publisher: suggestion.publisher,
        edition: suggestion.edition,
        isbn: suggestion.isbn,
        block: finalBlock,
        shelfNumber: finalShelf,
        callNumber: finalCallNumber,
        adminNotes: payload.adminNotes,
      });
    } catch (mailErr) {
      console.error("[BookSuggestion Service] Failed to send fulfillment appreciation email:", mailErr);
    }
  }

  return updatedSuggestion;
};

/**
 * Update suggestion status (e.g. approve for acquisition or reject with reason)
 */
const updateStatus = async (adminId: string, suggestionId: string, payload: IUpdateSuggestionStatusPayload) => {
  const suggestion = await prisma.bookSuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion) {
    throw new AppError(status.NOT_FOUND, "Book suggestion not found.");
  }

  const updated = await prisma.bookSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: payload.status,
      adminNotes: payload.adminNotes || null,
      fulfilledById: adminId,
    },
    include: {
      user: true,
    },
  });

  return updated;
};

/**
 * Delete suggestion (author can delete if pending, admin can delete anytime)
 */
const deleteSuggestion = async (userId: string, userRole: string, suggestionId: string) => {
  const suggestion = await prisma.bookSuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion) {
    throw new AppError(status.NOT_FOUND, "Book suggestion not found.");
  }

  const isStaff = [Role.admin, Role.librarian, Role.super_admin].includes(userRole as any);
  const isAuthor = suggestion.userId === userId;

  if (!isStaff && !isAuthor) {
    throw new AppError(status.FORBIDDEN, "You do not have permission to delete this suggestion.");
  }

  if (isAuthor && !isStaff && suggestion.status !== SuggestionStatus.pending) {
    throw new AppError(status.BAD_REQUEST, "Cannot delete a suggestion that has already been reviewed.");
  }

  await prisma.bookSuggestion.delete({
    where: { id: suggestionId },
  });

  return { message: "Suggestion deleted successfully." };
};

export const BookSuggestionService = {
  createSuggestion,
  getSuggestions,
  toggleVote,
  fulfillSuggestion,
  updateStatus,
  deleteSuggestion,
};
