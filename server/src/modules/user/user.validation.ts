import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
});

export const requestEmailChangeSchema = z.object({
    newEmail: z.string({ error: "New email is required" }).email("Invalid email address"),
    currentPassword: z.string({ error: "Current password is required" }),
});

export const verifyEmailChangeSchema = z.object({
    code: z.string({ error: "Verification code is required" }).regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export const requestPasswordChangeSchema = z.object({
    currentPassword: z.string({ error: "Current password is required" }),
});

export const verifyPasswordChangeSchema = z.object({
    currentPassword: z.string({ error: "Current password is required" }),
    newPassword: z.string({ error: "New password is required" }).min(6, "Password must be at least 6 characters"),
    code: z.string({ error: "Verification code is required" }).regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export const UserValidation = {
    updateProfileSchema,
    requestEmailChangeSchema,
    verifyEmailChangeSchema,
    requestPasswordChangeSchema,
    verifyPasswordChangeSchema,
};
