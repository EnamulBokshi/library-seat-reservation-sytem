import { Response } from "express";

interface IResponse<T> {
    httpStatusCode: number;
    success: boolean;
    data?: T;
    message?: string;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        /** Optional facet tallies a list endpoint may attach, e.g. rows per status. */
        counts?: Record<string, number>;
    };
}

export const sendResponse = async <T>(res: Response, data: IResponse<T>) => {
    res.status(data.httpStatusCode).json({
        success: data.success,
        data: data.data || null,
        message: data.message || null,
        meta: data.meta || null
    })
}
