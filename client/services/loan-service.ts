import apiClient from "./api-client";
import {
  BookLoan,
  StudentLoanSummary,
  CirculationStats,
  LoanQueryParams,
  LoanStatus,
  ApiResponse,
} from "@/lib/types";

export const loanService = {
  /**
   * Student submits a borrow request
   */
  async requestBorrow(bookId: string, notes?: string): Promise<ApiResponse<BookLoan>> {
    return apiClient.post<unknown, ApiResponse<BookLoan>>("/loan/request", { bookId, notes });
  },

  /**
   * Student renews an active loan
   */
  async renewLoan(loanId: string): Promise<ApiResponse<BookLoan>> {
    return apiClient.post<unknown, ApiResponse<BookLoan>>(`/loan/${loanId}/renew`);
  },

  /**
   * Get student's personal loans and quota summary
   */
  async getMyLoans(): Promise<ApiResponse<StudentLoanSummary>> {
    return apiClient.get<unknown, ApiResponse<StudentLoanSummary>>("/loan/my-loans");
  },

  /**
   * Get all circulation loans with filters (Admin / Librarian)
   */
  async getAll(params?: LoanQueryParams): Promise<ApiResponse<BookLoan[]>> {
    return apiClient.get<unknown, ApiResponse<BookLoan[]>>("/loan", { params });
  },

  /**
   * Get circulation statistics (Admin / Librarian)
   */
  async getStats(): Promise<ApiResponse<CirculationStats>> {
    return apiClient.get<unknown, ApiResponse<CirculationStats>>("/loan/stats");
  },

  /**
   * Admin direct issue book to a student ID/email
   */
  async directIssue(payload: {
    bookId: string;
    studentIdentifier: string;
    dueDate?: string;
    notes?: string;
  }): Promise<ApiResponse<BookLoan>> {
    return apiClient.post<unknown, ApiResponse<BookLoan>>("/loan/direct-issue", payload);
  },

  /**
   * Admin update loan status (approve, reject, cancel)
   */
  async updateStatus(loanId: string, status: LoanStatus, notes?: string): Promise<ApiResponse<BookLoan>> {
    return apiClient.patch<unknown, ApiResponse<BookLoan>>(`/loan/${loanId}/status`, { status, notes });
  },

  /**
   * Admin marks book as returned (restores stock)
   */
  async returnBook(loanId: string): Promise<ApiResponse<BookLoan>> {
    return apiClient.post<unknown, ApiResponse<BookLoan>>(`/loan/${loanId}/return`);
  },

  /**
   * Admin manual loan renewal / extension
   */
  async adminRenew(loanId: string, extendedDays?: number, notes?: string): Promise<ApiResponse<BookLoan>> {
    return apiClient.post<unknown, ApiResponse<BookLoan>>(`/loan/${loanId}/admin-renew`, { extendedDays, notes });
  },
};

export default loanService;
