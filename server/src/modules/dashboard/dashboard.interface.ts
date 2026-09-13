/**
 * Counters shown as badges on the workspace navigation. Every key is always
 * present; a role that cannot see a queue simply reads 0, so the client never
 * has to branch on undefined.
 */
export interface INavBadgeCounts {
    /** Verified account requests awaiting an admin decision. */
    pendingApprovals: number;
    /** Faculty fine-waiver petitions awaiting a decision. */
    pendingWaivers: number;
    /** Today's reservations still live: booked or checked in. */
    activeBookings: number;
    /** Outstanding fines across the seat and loan ledgers. */
    unpaidFines: number;
    /** Waiver petitions this faculty member raised and that are still open. */
    myPendingWaivers: number;
    /** Physical book borrow requests awaiting desk approval. */
    pendingBorrowRequests: number;
    /** The signed-in user's own outstanding fines. */
    myUnpaidFines: number;
}
