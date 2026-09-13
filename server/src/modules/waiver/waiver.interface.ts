export interface ICreateWaiverRequestPayload {
    targetUserId: string;
    /** Exactly one of bookingId / loanId identifies the fine. */
    bookingId?: string;
    loanId?: string;
    reason: string;
}

export interface IDecideWaiverRequestPayload {
    status: "approved" | "rejected";
    decisionNote?: string;
}

export interface IWaiverFilterOptions {
    status?: string;
    page?: number;
    limit?: number;
}
