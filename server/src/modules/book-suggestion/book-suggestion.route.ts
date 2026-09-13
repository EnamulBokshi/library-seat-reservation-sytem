import { Router } from "express";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { BookSuggestionValidation } from "./book-suggestion.validation";
import { BookSuggestionController } from "./book-suggestion.controller";

const bookSuggestionRoute: Router = Router();

// Submit a new book recommendation (Faculty only)
bookSuggestionRoute.post(
  "/",
  authCheck("faculty"),
  requestValidator(BookSuggestionValidation.createSuggestionSchema),
  BookSuggestionController.createSuggestion
);

// Get book suggestions with upvote rankings and filters
bookSuggestionRoute.get(
  "/",
  authCheck("faculty", "admin", "librarian", "super_admin"),
  BookSuggestionController.getSuggestions
);

// Toggle upvote on a book suggestion (Faculty only)
bookSuggestionRoute.post(
  "/:id/vote",
  authCheck("faculty"),
  BookSuggestionController.toggleVote
);

// Fulfill a suggestion: add book to catalog & send formal gratitude email (Admin / Staff)
bookSuggestionRoute.patch(
  "/:id/fulfill",
  authCheck("admin", "librarian", "super_admin"),
  requestValidator(BookSuggestionValidation.fulfillSuggestionSchema),
  BookSuggestionController.fulfillSuggestion
);

// Update suggestion review status (Admin / Staff)
bookSuggestionRoute.patch(
  "/:id/status",
  authCheck("admin", "librarian", "super_admin"),
  requestValidator(BookSuggestionValidation.updateStatusSchema),
  BookSuggestionController.updateStatus
);

// Delete suggestion (Proposing faculty if pending, or Admin)
bookSuggestionRoute.delete(
  "/:id",
  authCheck("faculty", "admin", "librarian", "super_admin"),
  BookSuggestionController.deleteSuggestion
);

export default bookSuggestionRoute;
