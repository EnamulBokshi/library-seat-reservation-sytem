export interface ICreateBookingPayload {
    seatId?: string;
    seatIds?: string[];
    scheduleId: string;
    guestCount?: number;
    tableNumber?: string;
}

export interface IFCFSQuickAssignPayload {
    zoneId: string;
    scheduleId: string;
    partySize?: number;
}
