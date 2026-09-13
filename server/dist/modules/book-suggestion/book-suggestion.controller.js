"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookSuggestionController = void 0;
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const http_status_1 = __importDefault(require("http-status"));
const book_suggestion_service_1 = require("./book-suggestion.service");
const createSuggestion = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await book_suggestion_service_1.BookSuggestionService.createSuggestion(userId, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Book recommendation submitted successfully. Your initial upvote has been registered.",
        data: result,
    });
});
const getSuggestions = (0, CatchAsync_1.default)(async (req, res) => {
    const viewerUserId = req.user.userId;
    const { searchTerm, status: filterStatus, department, onlyMySuggestions, page, limit, sortBy, sortOrder, } = req.query;
    const result = await book_suggestion_service_1.BookSuggestionService.getSuggestions(viewerUserId, {
        searchTerm: searchTerm,
        status: filterStatus,
        department: department,
        onlyMySuggestions: onlyMySuggestions === "true",
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        sortBy: sortBy || "upvoteCount",
        sortOrder: sortOrder || "desc",
    });
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Book suggestions retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});
const toggleVote = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const id = req.params.id;
    const result = await book_suggestion_service_1.BookSuggestionService.toggleVote(userId, id);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.hasUpvoted ? "Upvoted successfully." : "Upvote removed.",
        data: result,
    });
});
const fulfillSuggestion = (0, CatchAsync_1.default)(async (req, res) => {
    const adminId = req.user.userId;
    const id = req.params.id;
    const result = await book_suggestion_service_1.BookSuggestionService.fulfillSuggestion(adminId, id, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Book suggestion fulfilled successfully. Appreciation email sent to the faculty member.",
        data: result,
    });
});
const updateStatus = (0, CatchAsync_1.default)(async (req, res) => {
    const adminId = req.user.userId;
    const id = req.params.id;
    const result = await book_suggestion_service_1.BookSuggestionService.updateStatus(adminId, id, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `Suggestion status updated to ${result.status}.`,
        data: result,
    });
});
const deleteSuggestion = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const id = req.params.id;
    const result = await book_suggestion_service_1.BookSuggestionService.deleteSuggestion(userId, userRole, id);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.message,
        data: null,
    });
});
exports.BookSuggestionController = {
    createSuggestion,
    getSuggestions,
    toggleVote,
    fulfillSuggestion,
    updateStatus,
    deleteSuggestion,
};
