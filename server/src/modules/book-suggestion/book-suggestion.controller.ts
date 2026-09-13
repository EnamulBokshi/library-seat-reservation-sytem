import { Request, Response } from "express";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import status from "http-status";
import { BookSuggestionService } from "./book-suggestion.service";
import { SuggestionStatus } from "../../generated/enums";

const createSuggestion = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await BookSuggestionService.createSuggestion(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Book recommendation submitted successfully. Your initial upvote has been registered.",
    data: result,
  });
});

const getSuggestions = catchAsync(async (req: Request, res: Response) => {
  const viewerUserId = req.user.userId;
  const {
    searchTerm,
    status: filterStatus,
    department,
    onlyMySuggestions,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await BookSuggestionService.getSuggestions(viewerUserId, {
    searchTerm: searchTerm as string,
    status: filterStatus as SuggestionStatus | "all",
    department: department as string,
    onlyMySuggestions: onlyMySuggestions === "true",
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    sortBy: (sortBy as "upvoteCount" | "createdAt") || "upvoteCount",
    sortOrder: (sortOrder as "asc" | "desc") || "desc",
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book suggestions retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const toggleVote = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const id = req.params.id as string;
  const result = await BookSuggestionService.toggleVote(userId, id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.hasUpvoted ? "Upvoted successfully." : "Upvote removed.",
    data: result,
  });
});

const fulfillSuggestion = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.userId;
  const id = req.params.id as string;
  const result = await BookSuggestionService.fulfillSuggestion(adminId, id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book suggestion fulfilled successfully. Appreciation email sent to the faculty member.",
    data: result,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.userId;
  const id = req.params.id as string;
  const result = await BookSuggestionService.updateStatus(adminId, id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Suggestion status updated to ${result.status}.`,
    data: result,
  });
});

const deleteSuggestion = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const id = req.params.id as string;
  const result = await BookSuggestionService.deleteSuggestion(userId, userRole, id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const BookSuggestionController = {
  createSuggestion,
  getSuggestions,
  toggleVote,
  fulfillSuggestion,
  updateStatus,
  deleteSuggestion,
};
