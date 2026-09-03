import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { BookService } from "./book.service";

const createBook = catchAsync(async (req: Request, res: Response) => {
  const result = await BookService.createBook(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Book added successfully",
    data: result,
  });
});

const getAllBooks = catchAsync(async (req: Request, res: Response) => {
  const showInactive = (req.user?.role === "admin" || req.user?.role === "librarian") && req.query.showInactive === "true";
  
  const options = {
    searchTerm: req.query.searchTerm as string,
    category: req.query.category as string,
    block: req.query.block as string,
    shelfNumber: req.query.shelfNumber as string,
    hasPdf: req.query.hasPdf === "true",
    inStockOnly: req.query.inStockOnly === "true",
    showInactive,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    sortBy: (req.query.sortBy as string) || "createdAt",
    sortOrder: ((req.query.sortOrder as string) || "desc") as "asc" | "desc",
  };

  const result = await BookService.getAllBooks(options);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Books catalog retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getBookById = catchAsync(async (req: Request, res: Response) => {
  const result = await BookService.getBookById(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book details retrieved successfully",
    data: result,
  });
});

const updateBook = catchAsync(async (req: Request, res: Response) => {
  const result = await BookService.updateBook(req.params.id as string, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book updated successfully",
    data: result,
  });
});

const deleteBook = catchAsync(async (req: Request, res: Response) => {
  const result = await BookService.deleteBook(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book deactivated successfully",
    data: result,
  });
});

const getCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await BookService.getCategories();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

const getSpatialIndex = catchAsync(async (req: Request, res: Response) => {
  const result = await BookService.getSpatialIndex();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Spatial index parameters retrieved successfully",
    data: result,
  });
});

export const BookController = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getCategories,
  getSpatialIndex,
};
