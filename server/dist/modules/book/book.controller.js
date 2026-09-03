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
const createBook = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await book_service_1.BookService.createBook(req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Book added successfully",
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
const updateBook = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await book_service_1.BookService.updateBook(req.params.id, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Book updated successfully",
        data: result,
    });
});
const deleteBook = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await book_service_1.BookService.deleteBook(req.params.id);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Book deactivated successfully",
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
    getAllBooks,
    getBookById,
    updateBook,
    deleteBook,
    getCategories,
    getSpatialIndex,
};
