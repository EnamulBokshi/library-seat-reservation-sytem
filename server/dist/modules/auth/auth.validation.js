"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthValidation = exports.refreshTokenSchema = exports.loginSchema = exports.resendRegistrationOtpSchema = exports.verifyRegistrationSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z
    .object({
    name: zod_1.z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string({ error: "Email is required" }).email("Invalid email address"),
    password: zod_1.z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters"),
    studentId: zod_1.z.string().optional(),
    // Self-registration only ever creates a student or a faculty account.
    role: zod_1.z.enum(["student", "faculty"]).optional(),
    facultyId: zod_1.z.string().min(2, "Faculty ID must be at least 2 characters").optional(),
    department: zod_1.z.string().min(2, "Department must be at least 2 characters").optional(),
    designation: zod_1.z.string().min(2, "Designation must be at least 2 characters").optional(),
})
    .refine((data) => data.role !== "faculty" || Boolean(data.facultyId?.trim()), {
    message: "Faculty ID is required for a faculty account",
    path: ["facultyId"],
})
    .refine((data) => data.role !== "faculty" || Boolean(data.department?.trim()), {
    message: "Department is required for a faculty account",
    path: ["department"],
});
exports.verifyRegistrationSchema = zod_1.z.object({
    email: zod_1.z.string({ error: "Email is required" }).email("Invalid email address"),
    code: zod_1.z.string({ error: "Verification code is required" }).length(6, "Verification code must be 6 digits"),
});
exports.resendRegistrationOtpSchema = zod_1.z.object({
    email: zod_1.z.string({ error: "Email is required" }).email("Invalid email address"),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string({ error: "Email is required" }).email("Invalid email address"),
    password: zod_1.z.string({ error: "Password is required" }),
});
exports.refreshTokenSchema = zod_1.z.object({
// Refresh token comes from cookie, no body required
});
exports.AuthValidation = {
    registerSchema: exports.registerSchema,
    verifyRegistrationSchema: exports.verifyRegistrationSchema,
    resendRegistrationOtpSchema: exports.resendRegistrationOtpSchema,
    loginSchema: exports.loginSchema,
    refreshTokenSchema: exports.refreshTokenSchema,
};
