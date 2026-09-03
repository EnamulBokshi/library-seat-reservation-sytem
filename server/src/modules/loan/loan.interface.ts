import { LoanStatus } from "../../generated/client";

export interface ILoanFilterOptions {
  status?: LoanStatus | "active" | "all";
  userId?: string;
  bookId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ICreateLoanRequestPayload {
  bookId: string;
  notes?: string;
}

export interface IDirectIssueLoanPayload {
  bookId: string;
  studentIdentifier: string; // studentId or email
  dueDate?: string; // ISO date or defaults to now + borrowPeriodDays
  notes?: string;
}

export interface IUpdateLoanStatusPayload {
  status: LoanStatus;
  notes?: string;
}

export interface IAdminRenewPayload {
  extendedDays?: number;
  notes?: string;
}
