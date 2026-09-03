import { LoanStatus, FineStatus, PaymentMethod } from "../../generated/enums";

export interface ILoanFilterOptions {
  status?: LoanStatus | "active" | "all";
  fineStatus?: FineStatus;
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
  bookIdentifier: string; // barcode, ISBN, call number, or bookId
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

export interface IPayFinePayload {
  paymentMethod: "cash" | "chalan" | "online";
  chalanNumber?: string;
  notes?: string;
}
