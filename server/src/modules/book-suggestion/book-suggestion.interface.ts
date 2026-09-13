import { SuggestionStatus } from "../../generated/enums";

export interface ICreateBookSuggestionPayload {
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  isbn?: string;
  department?: string;
  courseCode?: string;
  reason?: string;
}

export interface ISuggestionFilterOptions {
  searchTerm?: string;
  status?: SuggestionStatus | "all";
  department?: string;
  onlyMySuggestions?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "upvoteCount" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface IFulfillSuggestionPayload {
  // If linking to an already existing book
  bookId?: string;

  // Or if creating a brand new catalog record
  createCatalogBook?: boolean;
  category?: string;
  block?: string;
  shelfNumber?: string;
  rowNumber?: string;
  callNumber?: string;
  totalCopies?: number;
  barcode?: string;
  description?: string;

  adminNotes?: string;
}

export interface IUpdateSuggestionStatusPayload {
  status: SuggestionStatus;
  adminNotes?: string;
}
