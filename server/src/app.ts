import express, { Application, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import indexRoutes from "./routes";
import { GlobalErrorHandler } from "./helpers/GlobarErrorHandler";
import { NotFoundMiddleware } from "./middleware/404";
import logger from "./middleware/requestLogger";
import { envVars } from "./config/envVars";
import AppError from "./helpers/AppError";
import status from "http-status";

const app: Application = express();
app.set("trust proxy", 1);

// Allowed browser origins. Credentialed requests (auth cookies) forbid a "*" origin,
// so every origin must be listed explicitly via FRONTEND_URL / CORS_ORIGINS
// (supports exact origins and leading wildcard subdomains like https://*.vercel.app).
const rawOrigins = [envVars.FRONTEND_URL, ...envVars.CORS_ORIGINS]
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0);

if (envVars.NODE_ENV === "development") {
    rawOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
}

const exactOrigins = new Set<string>();
const wildcardOriginMatchers: RegExp[] = [];

for (const entry of rawOrigins) {
    if (entry.includes("://*.")) {
        const [scheme, hostSuffix] = entry.split("://*.");
        if (scheme && hostSuffix) {
            const escapedSuffix = hostSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            wildcardOriginMatchers.push(
                new RegExp(`^${scheme}://[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.${escapedSuffix}$`, "i"),
            );
        }
    } else {
        exactOrigins.add(entry);
    }
}

const isOriginAllowed = (origin: string): boolean => {
    const normalized = origin.replace(/\/+$/, "");
    if (exactOrigins.has(normalized)) {
        return true;
    }
    return wildcardOriginMatchers.some((pattern) => pattern.test(normalized));
};

const corsOptions: CorsOptions = {
    origin(origin, callback) {
        // Same-origin, server-to-server and tooling requests send no Origin header.
        if (!origin) {
            return callback(null, true);
        }
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        return callback(new AppError(status.FORBIDDEN, "Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

// Middleware
app.use(cors(corsOptions));
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
