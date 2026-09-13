"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const user_validation_1 = require("./user.validation");
const userRoute = (0, express_1.Router)();
// GET /api/v1/user — admin user directory
userRoute.get("/", (0, authCheck_1.default)("admin"), user_controller_1.UserController.listUsers);
// POST /api/v1/user — admin create user directly
userRoute.post("/", (0, authCheck_1.default)("admin"), (0, requestValidator_1.default)(user_validation_1.UserValidation.createUserSchema), user_controller_1.UserController.createUser);
// GET /api/v1/user/pending-approvals — faculty signups awaiting a decision
userRoute.get("/pending-approvals", (0, authCheck_1.default)("admin"), user_controller_1.UserController.getPendingApprovals);
// PATCH /api/v1/user/:id/approve — activate a pending account
userRoute.patch("/:id/approve", (0, authCheck_1.default)("admin"), user_controller_1.UserController.approveUser);
// PATCH /api/v1/user/:id/reject — decline a pending account with a reason
userRoute.patch("/:id/reject", (0, authCheck_1.default)("admin"), (0, requestValidator_1.default)(user_validation_1.UserValidation.rejectUserSchema), user_controller_1.UserController.rejectUser);
// GET /api/v1/user/me — own profile
userRoute.get("/me", (0, authCheck_1.default)(), user_controller_1.UserController.getProfile);
// PATCH /api/v1/user/me — change display name (no verification needed)
userRoute.patch("/me", (0, authCheck_1.default)(), (0, requestValidator_1.default)(user_validation_1.UserValidation.updateProfileSchema), user_controller_1.UserController.updateProfile);
// GET /api/v1/user/me/fines — seat + loan fine statement
userRoute.get("/me/fines", (0, authCheck_1.default)(), user_controller_1.UserController.getMyFines);
// POST /api/v1/user/me/email/request-otp — mail a code to the NEW address
userRoute.post("/me/email/request-otp", (0, authCheck_1.default)(), (0, requestValidator_1.default)(user_validation_1.UserValidation.requestEmailChangeSchema), user_controller_1.UserController.requestEmailChange);
// POST /api/v1/user/me/email/verify — commit the email change
userRoute.post("/me/email/verify", (0, authCheck_1.default)(), (0, requestValidator_1.default)(user_validation_1.UserValidation.verifyEmailChangeSchema), user_controller_1.UserController.verifyEmailChange);
// POST /api/v1/user/me/password/request-otp — mail a code to the CURRENT address
userRoute.post("/me/password/request-otp", (0, authCheck_1.default)(), (0, requestValidator_1.default)(user_validation_1.UserValidation.requestPasswordChangeSchema), user_controller_1.UserController.requestPasswordChange);
// POST /api/v1/user/me/password/verify — commit the password change
userRoute.post("/me/password/verify", (0, authCheck_1.default)(), (0, requestValidator_1.default)(user_validation_1.UserValidation.verifyPasswordChangeSchema), user_controller_1.UserController.verifyPasswordChange);
// PATCH /api/v1/user/:id — admin update user profile, role, or active status
userRoute.patch("/:id", (0, authCheck_1.default)("admin"), (0, requestValidator_1.default)(user_validation_1.UserValidation.adminUpdateUserSchema), user_controller_1.UserController.updateUser);
// DELETE /api/v1/user/:id — admin delete user account
userRoute.delete("/:id", (0, authCheck_1.default)("admin"), user_controller_1.UserController.deleteUser);
exports.default = userRoute;
