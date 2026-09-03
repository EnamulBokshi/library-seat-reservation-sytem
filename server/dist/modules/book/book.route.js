"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const book_controller_1 = require("./book.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const book_validation_1 = require("./book.validation");
const bookRoute = (0, express_1.Router)();
// Public / Authenticated catalog endpoints
bookRoute.get("/categories", book_controller_1.BookController.getCategories);
bookRoute.get("/spatial-index", book_controller_1.BookController.getSpatialIndex);
bookRoute.get("/", book_controller_1.BookController.getAllBooks);
bookRoute.get("/:id", book_controller_1.BookController.getBookById);
// Admin / Librarian management endpoints
bookRoute.post("/", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(book_validation_1.BookValidation.createBookSchema), book_controller_1.BookController.createBook);
bookRoute.patch("/:id", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(book_validation_1.BookValidation.updateBookSchema), book_controller_1.BookController.updateBook);
bookRoute.delete("/:id", (0, authCheck_1.default)("admin", "librarian"), book_controller_1.BookController.deleteBook);
exports.default = bookRoute;
