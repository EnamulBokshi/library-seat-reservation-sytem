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
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({ origin: ["*"], methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], credentials: true }));
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
