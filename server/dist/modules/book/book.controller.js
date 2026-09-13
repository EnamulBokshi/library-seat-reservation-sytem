"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const book_service_1 = require("./book.service");
const cloudinary_1 = require("../../lib/cloudinary");
const uploadBookImage = (0, CatchAsync_1.default)(async (req, res) => {
    if (!req.file) {
        (0, SendResponse_1.sendResponse)(res, {
            httpStatusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: "No image file provided for upload.",
            data: null,
        });
        return;
    }
    const uploadResult = await (0, cloudinary_1.uploadImageToCloudinary)(req.file.buffer, req.file.originalname, "smart-library/books");
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Image uploaded successfully.",
        data: {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            format: uploadResult.format,
        },
    });
});
const createBook = (0, CatchAsync_1.default)(async (req, res) => {
    let uploadedPublicId = null;
    try {
        // If an image was uploaded directly via multipart form:
        if (req.file) {
            const uploadResult = await (0, cloudinary_1.uploadImageToCloudinary)(req.file.buffer, req.file.originalname, "smart-library/books");
            uploadedPublicId = uploadResult.publicId;
            req.body.coverImage = uploadResult.url;
        }
        const result = await book_service_1.BookService.createBook(req.body);
        (0, SendResponse_1.sendResponse)(res, {
            httpStatusCode: http_status_1.default.CREATED,
            success: true,
            message: "Book added successfully",
            data: result,
        });
    }
    catch (error) {
        // CRITICAL: Clean up / delete uploaded image from Cloudinary if book creation failed
        if (uploadedPublicId) {
            console.warn(`⚠️ Book creation failed. Rolling back Cloudinary asset: ${uploadedPublicId}`);
            await (0, cloudinary_1.deleteFromCloudinary)(uploadedPublicId);
        }
        throw error;
    }
});
const updateBook = (0, CatchAsync_1.default)(async (req, res) => {
    let newUploadedPublicId = null;
    const bookId = req.params.id;
    try {
        const existingBook = await book_service_1.BookService.getBookById(bookId);
        // If new image file uploaded:
        if (req.file) {
            const uploadResult = await (0, cloudinary_1.uploadImageToCloudinary)(req.file.buffer, req.file.originalname, "smart-library/books");
            newUploadedPublicId = uploadResult.publicId;
            req.body.coverImage = uploadResult.url;
        }
        const result = await book_service_1.BookService.updateBook(bookId, req.body);
        // If update succeeded and a new image was uploaded, remove the old Cloudinary image
        if (newUploadedPublicId && existingBook?.coverImage) {
            const oldPublicId = (0, cloudinary_1.extractPublicIdFromUrl)(existingBook.coverImage);
            if (oldPublicId && oldPublicId !== newUploadedPublicId) {
                await (0, cloudinary_1.deleteFromCloudinary)(oldPublicId);
            }
        }
        (0, SendResponse_1.sendResponse)(res, {
            httpStatusCode: http_status_1.default.OK,
            success: true,
            message: "Book updated successfully",
            data: result,
        });
    }
    catch (error) {
        // Rollback newly uploaded image on failure
        if (newUploadedPublicId) {
            console.warn(`⚠️ Book update failed. Rolling back Cloudinary asset: ${newUploadedPublicId}`);
            await (0, cloudinary_1.deleteFromCloudinary)(newUploadedPublicId);
        }
        throw error;
    }
});
const deleteBook = (0, CatchAsync_1.default)(async (req, res) => {
    const bookId = req.params.id;
    const existingBook = await book_service_1.BookService.getBookById(bookId).catch(() => null);
    const result = await book_service_1.BookService.deleteBook(bookId);
    // If book had a Cloudinary cover image, clean it up
    if (existingBook?.coverImage) {
        const publicId = (0, cloudinary_1.extractPublicIdFromUrl)(existingBook.coverImage);
        if (publicId) {
            await (0, cloudinary_1.deleteFromCloudinary)(publicId);
        }
    }
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Book deactivated successfully",
        data: result,
    });
});
const getAllBooks = (0, CatchAsync_1.default)(async (req, res) => {
    const showInactive = (req.user?.role === "admin" || req.user?.role === "librarian") && req.query.showInactive === "true";
    const options = {
        searchTerm: req.query.searchTerm,
        category: req.query.category,
        block: req.query.block,
        shelfNumber: req.query.shelfNumber,
        hasPdf: req.query.hasPdf === "true",
        inStockOnly: req.query.inStockOnly === "true",
        showInactive,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: (req.query.sortOrder || "desc"),
    };
    const result = await book_service_1.BookService.getAllBooks(options);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Books catalog retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
});
const getBookById = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await book_service_1.BookService.getBookById(req.params.id);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Book details retrieved successfully",
        data: result,
    });
});
const getCategories = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await book_service_1.BookService.getCategories();
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Categories retrieved successfully",
        data: result,
    });
});
const getSpatialIndex = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await book_service_1.BookService.getSpatialIndex();
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Spatial index parameters retrieved successfully",
        data: result,
    });
});
exports.BookController = {
    createBook,
    uploadBookImage,
    getAllBooks,
    getBookById,
    updateBook,
    deleteBook,
    getCategories,
    getSpatialIndex,
};
