"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthValidation = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string({ error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string({ error: "Email is required" }).email("Invalid email address"),
    password: zod_1.z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters"),
    studentId: zod_1.z.string().optional(),
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
    loginSchema: exports.loginSchema,
    refreshTokenSchema: exports.refreshTokenSchema,
};
