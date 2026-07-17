export interface ICreateSeatPayload {
    seatNumber: string;
    zoneId: string;
}

export interface IUpdateSeatPayload {
    seatNumber?: string;
    isActive?: boolean;
    isOccupied?: boolean;
}
