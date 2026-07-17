import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import indexRoutes from "./routes";
import { GlobalErrorHandler } from "./helpers/GlobarErrorHandler";
import { NotFoundMiddleware } from "./middleware/404";
import logger from "./middleware/requestLogger";

const app: Application = express();

// Middleware
app.use(cors({ origin: ["*"], methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger);

// Health check
app.get("/", (req: Request, res: Response) => {
    res.json({ success: true, message: "Smart Library Seat Reservation API is running" });
});

// API routes
app.use('/api/v1', indexRoutes);

// 404 handler — must be after all routes
app.use(NotFoundMiddleware);

// Global error handler — must be last
app.use(GlobalErrorHandler);

export default app;
