import { ZoneType, TableType } from "../../generated/enums";

export interface ICreateZonePayload {
    name: string;
    description?: string;
    color?: string;
    zoneType?: ZoneType;
    allowMultiSeat?: boolean;
    maxSeatsPerBooking?: number;
    defaultTableType?: TableType;
    rules?: string[];
    isActive?: boolean;
}

export interface IUpdateZonePayload {
    name?: string;
    description?: string;
    color?: string;
    zoneType?: ZoneType;
    allowMultiSeat?: boolean;
    maxSeatsPerBooking?: number;
    defaultTableType?: TableType;
    rules?: string[];
    isActive?: boolean;
}
