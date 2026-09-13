export interface IUpdateProfilePayload {
    name: string;
}

export interface IRequestEmailChangePayload {
    newEmail: string;
    currentPassword: string;
}

export interface IVerifyEmailChangePayload {
    code: string;
}

export interface IRequestPasswordChangePayload {
    currentPassword: string;
}

export interface IVerifyPasswordChangePayload {
    currentPassword: string;
    newPassword: string;
    code: string;
}

export interface IFineEntry {
    id: string;
    /** Which ledger the fine came from. */
    source: "booking" | "loan";
    amount: number;
    status: string;
    reason: string | null;
    /** Seat fines: the cancelled/no-show slot. Loan fines: the book title. */
    subject: string;
    incurredAt: Date | null;
    paidAt: Date | null;
    paymentMethod: string | null;
    chalanNumber: string | null;
}

export interface IMyFinesResult {
    seatFines: IFineEntry[];
    loanFines: IFineEntry[];
    summary: {
        seatUnpaidTotal: number;
        loanUnpaidTotal: number;
        totalUnpaid: number;
        maxUnpaidFineLimit: number;
        isBookingBlocked: boolean;
        remainingBalance: number;
    };
}
