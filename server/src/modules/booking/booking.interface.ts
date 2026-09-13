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

export interface IPaySeatFinePayload {
    paymentMethod: "cash" | "chalan" | "online";
    chalanNumber?: string;
    notes?: string;
}

export interface IWaiveSeatFinePayload {
    reason?: string;
}
