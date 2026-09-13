"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = exports.adminUpdateUserSchema = exports.createUserSchema = exports.rejectUserSchema = exports.verifyPasswordChangeSchema = exports.requestPasswordChangeSchema = exports.verifyEmailChangeSchema = exports.requestEmailChangeSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
});
exports.requestEmailChangeSchema = zod_1.z.object({
    newEmail: zod_1.z.string({ error: "New email is required" }).email("Invalid email address"),
    currentPassword: zod_1.z.string({ error: "Current password is required" }),
});
exports.verifyEmailChangeSchema = zod_1.z.object({
    code: zod_1.z.string({ error: "Verification code is required" }).regex(/^\d{6}$/, "Verification code must be 6 digits"),
});
exports.requestPasswordChangeSchema = zod_1.z.object({
    currentPassword: zod_1.z.string({ error: "Current password is required" }),
});
exports.verifyPasswordChangeSchema = zod_1.z.object({
    currentPassword: zod_1.z.string({ error: "Current password is required" }),
    newPassword: zod_1.z.string({ error: "New password is required" }).min(6, "Password must be at least 6 characters"),
    code: zod_1.z.string({ error: "Verification code is required" }).regex(/^\d{6}$/, "Verification code must be 6 digits"),
});
exports.rejectUserSchema = zod_1.z.object({
    reason: zod_1.z
        .string({ error: "A rejection reason is required" })
        .min(5, "Give the applicant a reason of at least 5 characters"),
});
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string({ error: "Email is required" }).email("Invalid email address"),
    password: zod_1.z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters"),
    role: zod_1.z.enum(["super_admin", "admin", "librarian", "student", "faculty"], {
        error: "Valid role is required",
    }),
    studentId: zod_1.z.string().optional().nullable(),
    facultyId: zod_1.z.string().optional().nullable(),
    department: zod_1.z.string().optional().nullable(),
    designation: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
exports.adminUpdateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").optional(),
    role: zod_1.z.enum(["super_admin", "admin", "librarian", "student", "faculty"]).optional(),
    isActive: zod_1.z.boolean().optional(),
    studentId: zod_1.z.string().optional().nullable(),
    facultyId: zod_1.z.string().optional().nullable(),
    department: zod_1.z.string().optional().nullable(),
    designation: zod_1.z.string().optional().nullable(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters").optional(),
});
exports.UserValidation = {
    rejectUserSchema: exports.rejectUserSchema,
    updateProfileSchema: exports.updateProfileSchema,
    requestEmailChangeSchema: exports.requestEmailChangeSchema,
    verifyEmailChangeSchema: exports.verifyEmailChangeSchema,
    requestPasswordChangeSchema: exports.requestPasswordChangeSchema,
    verifyPasswordChangeSchema: exports.verifyPasswordChangeSchema,
    createUserSchema: exports.createUserSchema,
    adminUpdateUserSchema: exports.adminUpdateUserSchema,
};
