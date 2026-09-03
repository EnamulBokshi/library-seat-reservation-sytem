import { Request, Response } from "express";
import status from "http-status";

const notFound = (req: Request, res: Response) => {
    res.status(status.NOT_FOUND).json({
        success: false,
        message: `Cannot find ${req.originalUrl} on this server`,

    })
}

export const NotFoundMiddleware = notFound;