import apiClient from "./api-client";
import {
  BookSuggestion,
  CreateBookSuggestionPayload,
  FulfillSuggestionPayload,
  SuggestionQueryParams,
  SuggestionStatus,
  ApiResponse,
} from "@/lib/types";

export const bookSuggestionService = {
  /**
   * Submit a new book recommendation (Faculty only)
   */
  async create(payload: CreateBookSuggestionPayload): Promise<ApiResponse<BookSuggestion>> {
    return apiClient.post<unknown, ApiResponse<BookSuggestion>>("/book-suggestion", payload);
  },

  /**
   * Get all book suggestions with filters and live upvote rank
   */
  async getAll(params?: SuggestionQueryParams): Promise<ApiResponse<BookSuggestion[]>> {
    return apiClient.get<unknown, ApiResponse<BookSuggestion[]>>("/book-suggestion", { params });
  },

  /**
   * Toggle upvote on a suggestion (Faculty only)
   */
  async toggleVote(id: string): Promise<ApiResponse<{ hasUpvoted: boolean; upvoteCount: number }>> {
    return apiClient.post<unknown, ApiResponse<{ hasUpvoted: boolean; upvoteCount: number }>>(
      `/book-suggestion/${id}/vote`
    );
  },

  /**
   * Admin fulfills suggestion, optionally creating catalog book & dispatching gratitude email
   */
  async fulfill(id: string, payload: FulfillSuggestionPayload): Promise<ApiResponse<BookSuggestion>> {
    return apiClient.patch<unknown, ApiResponse<BookSuggestion>>(`/book-suggestion/${id}/fulfill`, payload);
  },

  /**
   * Admin updates review status (approve / reject)
   */
  async updateStatus(
    id: string,
    payload: { status: SuggestionStatus; adminNotes?: string }
  ): Promise<ApiResponse<BookSuggestion>> {
    return apiClient.patch<unknown, ApiResponse<BookSuggestion>>(`/book-suggestion/${id}/status`, payload);
  },

  /**
   * Delete a suggestion
   */
  async delete(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<unknown, ApiResponse<null>>(`/book-suggestion/${id}`);
  },
};

export default bookSuggestionService;
