export interface ICreateZonePayload {
    name: string;
    description?: string;
    color?: string;
    rules?: string[];
    isActive?: boolean;
}

export interface IUpdateZonePayload {
    name?: string;
    description?: string;
    color?: string;
    rules?: string[];
    isActive?: boolean;
}
