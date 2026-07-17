import dotenv from "dotenv";
import status from "http-status";
import AppError from "../helpers/AppError";

dotenv.config();

interface EnvConfig {
    PORT: number;
    NODE_ENV: string;
    DATABASE_URL: string;
    ACCESS_TOKEN_SECRET: string;
    REFRESH_TOKEN_SECRET: string;
    ACCESS_TOKEN_EXPIRES_IN: number;
    REFRESH_TOKEN_EXPIRES_IN: number;
    BCRYPT_SALT_ROUNDS: number;
    SUPER_ADMIN_NAME: string;
    SUPER_ADMIN_EMAIL: string;
    SUPER_ADMIN_PASSWORD: string;
    FRONTEND_URL: string;
    SMTP: {
        SMTP_HOST: string;
        SMTP_PORT: number;
        SMTP_USER: string;
        SMTP_PASS: string;
    }
}

const loadEnvVariables = (): EnvConfig => {
    const requiredEnvVars = [
        "PORT",
        "DATABASE_URL",
        "ACCESS_TOKEN_SECRET",
        "REFRESH_TOKEN_SECRET",
    ];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new AppError(
                status.INTERNAL_SERVER_ERROR,
                `Missing required environment variable: ${envVar}`,
            );
        }
    }

    return {
        PORT: parseInt(process.env.PORT || "5000", 10),
        NODE_ENV: process.env.NODE_ENV || "development",
        DATABASE_URL: process.env.DATABASE_URL as string,
        ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
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

export const envVars = loadEnvVariables();