import { z } from "zod";

export const registerSchema = z
    .object({
        name: z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
        email: z.string({ error: "Email is required" }).email("Invalid email address"),
        password: z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters"),
        studentId: z.string().optional(),
        // Self-registration only ever creates a student or a faculty account.
        role: z.enum(["student", "faculty"]).optional(),
        facultyId: z.string().min(2, "Faculty ID must be at least 2 characters").optional(),
        department: z.string().min(2, "Department must be at least 2 characters").optional(),
        designation: z.string().min(2, "Designation must be at least 2 characters").optional(),
    })
    .refine((data) => data.role !== "faculty" || Boolean(data.facultyId?.trim()), {
        message: "Faculty ID is required for a faculty account",
        path: ["facultyId"],
    })
    .refine((data) => data.role !== "faculty" || Boolean(data.department?.trim()), {
        message: "Department is required for a faculty account",
        path: ["department"],
    });

export const verifyRegistrationSchema = z.object({
    email: z.string({ error: "Email is required" }).email("Invalid email address"),
    code: z.string({ error: "Verification code is required" }).length(6, "Verification code must be 6 digits"),
});

export const resendRegistrationOtpSchema = z.object({
    email: z.string({ error: "Email is required" }).email("Invalid email address"),
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
    verifyRegistrationSchema,
    resendRegistrationOtpSchema,
    loginSchema,
    refreshTokenSchema,
};
