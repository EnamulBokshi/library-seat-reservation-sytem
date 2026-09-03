import { z } from "zod";

export const registerSchema = z.object({
    name: z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    email: z.string({ error: "Email is required" }).email("Invalid email address"),
    password: z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters"),
    studentId: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string({ error: "Email is required" }).email("Invalid email address"),
    password: z.string({ error: "Password is required" }),
});

export const refreshTokenSchema = z.object({
    // Refresh token comes from cookie, no body required
});

export const AuthValidation = {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
};
