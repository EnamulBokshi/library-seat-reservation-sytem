"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routes_1 = __importDefault(require("./routes"));
const GlobarErrorHandler_1 = require("./helpers/GlobarErrorHandler");
const _404_1 = require("./middleware/404");
const requestLogger_1 = __importDefault(require("./middleware/requestLogger"));
const envVars_1 = require("./config/envVars");
const AppError_1 = __importDefault(require("./helpers/AppError"));
const http_status_1 = __importDefault(require("http-status"));
const app = (0, express_1.default)();
// Allowed browser origins. Credentialed requests (auth cookies) forbid a "*" origin,
// so every origin must be listed explicitly via FRONTEND_URL / CORS_ORIGINS.
const allowedOrigins = new Set([envVars_1.envVars.FRONTEND_URL, ...envVars_1.envVars.CORS_ORIGINS]
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0));
if (envVars_1.envVars.NODE_ENV === "development") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
}
const corsOptions = {
    origin(origin, callback) {
        // Same-origin, server-to-server and tooling requests send no Origin header.
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.has(origin.replace(/\/+$/, ""))) {
            return callback(null, true);
        }
        return callback(new AppError_1.default(http_status_1.default.FORBIDDEN, "Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(requestLogger_1.default);
// Health check
app.get("/", (req, res) => {
    res.json({ success: true, message: "Smart Library Seat Reservation API is running" });
});
// API routes
app.use('/api/v1', routes_1.default);
// 404 handler — must be after all routes
app.use(_404_1.NotFoundMiddleware);
// Global error handler — must be last
app.use(GlobarErrorHandler_1.GlobalErrorHandler);
exports.default = app;
