import { TableType } from "../../generated/enums";

export interface ICreateSeatPayload {
    seatNumber: string;
    zoneId: string;
    tableNumber?: string;
    tableType?: TableType;
    tableCapacity?: number;
    seatPosition?: number;
}

export interface ICreateTableClusterPayload {
    zoneId: string;
    tableNumber: string;
    tableType: TableType;
    chairCount: number;
    prefix?: string;
}

export interface IBulkCreateTablesPayload {
    zoneId: string;
    tableType: TableType;
    tableCount: number;
    chairsPerTable: number;
    tablePrefix?: string;
    startTableNumber?: number;
}

export interface IUpdateSeatPayload {
    seatNumber?: string;
    tableNumber?: string | null;
    tableType?: TableType;
    tableCapacity?: number | null;
    seatPosition?: number | null;
    isActive?: boolean;
    isOccupied?: boolean;
}
