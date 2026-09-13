"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const book_suggestion_validation_1 = require("./book-suggestion.validation");
const book_suggestion_controller_1 = require("./book-suggestion.controller");
const bookSuggestionRoute = (0, express_1.Router)();
// Submit a new book recommendation (Faculty only)
bookSuggestionRoute.post("/", (0, authCheck_1.default)("faculty"), (0, requestValidator_1.default)(book_suggestion_validation_1.BookSuggestionValidation.createSuggestionSchema), book_suggestion_controller_1.BookSuggestionController.createSuggestion);
// Get book suggestions with upvote rankings and filters
bookSuggestionRoute.get("/", (0, authCheck_1.default)("faculty", "admin", "librarian", "super_admin"), book_suggestion_controller_1.BookSuggestionController.getSuggestions);
// Toggle upvote on a book suggestion (Faculty only)
bookSuggestionRoute.post("/:id/vote", (0, authCheck_1.default)("faculty"), book_suggestion_controller_1.BookSuggestionController.toggleVote);
// Fulfill a suggestion: add book to catalog & send formal gratitude email (Admin / Staff)
bookSuggestionRoute.patch("/:id/fulfill", (0, authCheck_1.default)("admin", "librarian", "super_admin"), (0, requestValidator_1.default)(book_suggestion_validation_1.BookSuggestionValidation.fulfillSuggestionSchema), book_suggestion_controller_1.BookSuggestionController.fulfillSuggestion);
// Update suggestion review status (Admin / Staff)
bookSuggestionRoute.patch("/:id/status", (0, authCheck_1.default)("admin", "librarian", "super_admin"), (0, requestValidator_1.default)(book_suggestion_validation_1.BookSuggestionValidation.updateStatusSchema), book_suggestion_controller_1.BookSuggestionController.updateStatus);
// Delete suggestion (Proposing faculty if pending, or Admin)
bookSuggestionRoute.delete("/:id", (0, authCheck_1.default)("faculty", "admin", "librarian", "super_admin"), book_suggestion_controller_1.BookSuggestionController.deleteSuggestion);
exports.default = bookSuggestionRoute;
