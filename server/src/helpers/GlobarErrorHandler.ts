import { NextFunction, Request, Response } from "express";
import AppError from "./AppError";
import { ZodError } from "zod";

export const GlobalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Global Error Handler caught:", err);

    let statusCode = 500;
    let message = "Something went wrong on the server. Please try again later.";
    let errorDetails: unknown = null;

    if (err instanceof AppError) {
        // Operational, trusted error: send specific message
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof ZodError) {
        // Validation error: 400 Bad Request
        statusCode = 400;
        message = err.issues.map((issue) => issue.message).join(", ") || "Validation Error";
        errorDetails = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
    } else {
        // Unhandled / Unexpected internal server error (e.g. database crash, prisma error)
        // Keep status code 500 and generic user-facing message to avoid leaking raw code/db stack traces
        statusCode = 500;
        message = "An unexpected error occurred. Please try again later.";
    }

    res.status(statusCode).json({
        success: false,
        message,
        error: errorDetails,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};