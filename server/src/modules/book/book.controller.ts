import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { BookService } from "./book.service";

import {
  uploadImageToCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl,
} from "../../lib/cloudinary";

const uploadBookImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "No image file provided for upload.",
      data: null,
    });
    return;
  }

  const uploadResult = await uploadImageToCloudinary(
    req.file.buffer,
    req.file.originalname,
    "smart-library/books"
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Image uploaded successfully.",
    data: {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
    },
  });
});

const createBook = catchAsync(async (req: Request, res: Response) => {
  let uploadedPublicId: string | null = null;

  try {
    // If an image was uploaded directly via multipart form:
    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(
        req.file.buffer,
        req.file.originalname,
        "smart-library/books"
      );
      uploadedPublicId = uploadResult.publicId;
      req.body.coverImage = uploadResult.url;
    }

    const result = await BookService.createBook(req.body);

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Book added successfully",
      data: result,
    });
  } catch (error) {
    // CRITICAL: Clean up / delete uploaded image from Cloudinary if book creation failed
    if (uploadedPublicId) {
      console.warn(`⚠️ Book creation failed. Rolling back Cloudinary asset: ${uploadedPublicId}`);
      await deleteFromCloudinary(uploadedPublicId);
    }
    throw error;
  }
});

const updateBook = catchAsync(async (req: Request, res: Response) => {
  let newUploadedPublicId: string | null = null;
  const bookId = req.params.id as string;

  try {
    const existingBook = await BookService.getBookById(bookId);

    // If new image file uploaded:
    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(
        req.file.buffer,
        req.file.originalname,
        "smart-library/books"
      );
      newUploadedPublicId = uploadResult.publicId;
      req.body.coverImage = uploadResult.url;
    }

    const result = await BookService.updateBook(bookId, req.body);

    // If update succeeded and a new image was uploaded, remove the old Cloudinary image
    if (newUploadedPublicId && existingBook?.coverImage) {
      const oldPublicId = extractPublicIdFromUrl(existingBook.coverImage);
      if (oldPublicId && oldPublicId !== newUploadedPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Book updated successfully",
      data: result,
    });
  } catch (error) {
    // Rollback newly uploaded image on failure
    if (newUploadedPublicId) {
      console.warn(`⚠️ Book update failed. Rolling back Cloudinary asset: ${newUploadedPublicId}`);
      await deleteFromCloudinary(newUploadedPublicId);
    }
    throw error;
  }
});

const deleteBook = catchAsync(async (req: Request, res: Response) => {
  const bookId = req.params.id as string;
  const existingBook = await BookService.getBookById(bookId).catch(() => null);

  const result = await BookService.deleteBook(bookId);

  // If book had a Cloudinary cover image, clean it up
  if (existingBook?.coverImage) {
    const publicId = extractPublicIdFromUrl(existingBook.coverImage);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book deactivated successfully",
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
  uploadBookImage,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getCategories,
  getSpatialIndex,
};
