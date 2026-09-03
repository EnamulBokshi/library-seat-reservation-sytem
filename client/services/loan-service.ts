import apiClient from "./api-client";
import {
  Book,
  BookLoan,
  StudentLoanSummary,
  StudentLookupResult,
  CirculationStats,
  LoanQueryParams,
  LoanStatus,
  PaymentMethod,
  ApiResponse,
} from "@/lib/types";

export const loanService = {
  /**
   * Fast lookup book by barcode, ISBN, call number, or UUID (Admin / Librarian)
   */
  async lookupBook(identifier: string): Promise<ApiResponse<Book>> {
    return apiClient.get<unknown, ApiResponse<Book>>(`/loan/lookup-book/${encodeURIComponent(identifier)}`);
  },

  /**
   * Fast lookup student by studentId, email, or UUID with live eligibility check (Admin / Librarian)
   */
  async lookupStudent(identifier: string): Promise<ApiResponse<StudentLookupResult>> {
    return apiClient.get<unknown, ApiResponse<StudentLookupResult>>(`/loan/lookup-student/${encodeURIComponent(identifier)}`);
  },

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
   * Get student's personal loans, fines, and quota summary
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
   * Admin direct issue book to a student (Barcode/ISBN + Student ID/Email)
   */
  async directIssue(payload: {
    bookIdentifier: string;
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
   * Admin marks book as returned (restores stock, computes fine)
   */
  async returnBook(loanId: string): Promise<ApiResponse<{ loan: BookLoan; daysOverdue: number; fineAmount: number; fineStatus: string }>> {
    return apiClient.post<unknown, ApiResponse<{ loan: BookLoan; daysOverdue: number; fineAmount: number; fineStatus: string }>>(`/loan/${loanId}/return`);
  },

  /**
   * Admin settles and clears student fine via Cash or Bank Chalan
   */
  async payFine(
    loanId: string,
    payload: {
      paymentMethod: PaymentMethod;
      chalanNumber?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<BookLoan>> {
    return apiClient.post<unknown, ApiResponse<BookLoan>>(`/loan/${loanId}/pay-fine`, payload);
  },

  /**
   * Admin manual loan renewal / extension
   */
  async adminRenew(loanId: string, extendedDays?: number, notes?: string): Promise<ApiResponse<BookLoan>> {
    return apiClient.post<unknown, ApiResponse<BookLoan>>(`/loan/${loanId}/admin-renew`, { extendedDays, notes });
  },
};

export default loanService;
