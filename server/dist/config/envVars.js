"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envVars = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../helpers/AppError"));
dotenv_1.default.config();
const loadEnvVariables = () => {
    const requiredEnvVars = [
        "PORT",
        "DATABASE_URL",
        "ACCESS_TOKEN_SECRET",
        "REFRESH_TOKEN_SECRET",
    ];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, `Missing required environment variable: ${envVar}`);
        }
    }
    return {
        PORT: parseInt(process.env.PORT || "5000", 10),
        NODE_ENV: process.env.NODE_ENV || "development",
        DATABASE_URL: process.env.DATABASE_URL,
        ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
        // Values are in seconds for JWT configuration.
        ACCESS_TOKEN_EXPIRES_IN: parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN || "86400", 10), // 1 day default
        REFRESH_TOKEN_EXPIRES_IN: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || "604800", 10), // 7 days default
        BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
        SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || "Admin",
        SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || "admin@library.com",
        SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || "admin123",
        FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
        SMTP: {
            SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
            SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
            SMTP_USER: process.env.SMTP_USER || "[EMAIL_ADDRESS]",
            SMTP_PASS: process.env.SMTP_PASS || "[PASSWORD]",
        }
    };
};
exports.envVars = loadEnvVariables();
