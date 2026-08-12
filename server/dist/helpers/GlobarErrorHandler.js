"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalErrorHandler = void 0;
const AppError_1 = __importDefault(require("./AppError"));
const zod_1 = require("zod");
const GlobalErrorHandler = (err, req, res, next) => {
    console.error("Global Error Handler caught:", err);
    let statusCode = 500;
    let message = "Something went wrong on the server. Please try again later.";
    let errorDetails = null;
    if (err instanceof AppError_1.default) {
        // Operational, trusted error: send specific message
        statusCode = err.statusCode;
        message = err.message;
    }
    else if (err instanceof zod_1.ZodError) {
        // Validation error: 400 Bad Request
        statusCode = 400;
        message = err.issues.map((issue) => issue.message).join(", ") || "Validation Error";
        errorDetails = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
    }
    else {
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
exports.GlobalErrorHandler = GlobalErrorHandler;
