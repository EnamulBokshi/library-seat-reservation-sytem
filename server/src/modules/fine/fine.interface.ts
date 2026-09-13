import { FineStatus, PaymentMethod } from "../../generated/enums";

export type FineSource = "all" | "seat" | "loan";

export interface IFineFilterOptions {
  source?: FineSource;
  status?: FineStatus | "all";
  paymentMethod?: PaymentMethod | "all";
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "incurredAt" | "amount" | "paidAt" | "status" | "studentName";
  sortOrder?: "asc" | "desc";
}

export interface IFineStudentSummary {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
}

export interface IFineRecord {
  id: string;
  source: "seat" | "loan";
  amount: number;
  status: FineStatus;
  reason: string | null;
  subject: string;
  incurredAt: Date | string;
  paidAt: Date | string | null;
  paymentMethod: PaymentMethod | null;
  chalanNumber: string | null;
  receivedBy: string | null;
  student: IFineStudentSummary;
  details: {
    bookingId?: string;
    loanId?: string;
    seatNumber?: string;
    zoneName?: string;
    scheduleDate?: string;
    slot?: string;
    bookingStatus?: string;
    bookTitle?: string;
    bookAuthor?: string;
    barcode?: string | null;
    isbn?: string | null;
    dueDate?: Date | string;
    returnDate?: Date | string | null;
  };
}

export interface IFineStats {
  totalOutstanding: number;
  outstandingCount: number;
  totalCollected: number;
  collectedCount: number;
  totalWaived: number;
  waivedCount: number;
  seatUnpaid: number;
  seatUnpaidCount: number;
  loanUnpaid: number;
  loanUnpaidCount: number;
  cashCollected: number;
  chalanCollected: number;
  onlineCollected: number;
  impactedStudentsCount: number;
  blockedStudentsCount: number;
  maxUnpaidFineLimit: number;
}
