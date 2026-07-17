import { NextFunction, Request, Response } from "express";
import AppError from "./AppError";
import { ZodError } from "zod";

export const GlobalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err);

    let statusCode = 500;
    let message = "Internal Server Error";
    let errorDetails: unknown = null;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof ZodError) {
        statusCode = 400;
        message = "Validation Error";
        errorDetails = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
    } else if (err instanceof Error) {
        message = err.message;
    }

    res.status(statusCode).json({
        success: false,
        message,
        error: errorDetails,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};