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
