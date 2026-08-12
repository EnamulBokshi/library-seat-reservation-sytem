"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const auth_validation_1 = require("./auth.validation");
const authRoute = (0, express_1.Router)();
// POST /api/v1/auth/register — public
authRoute.post("/register", (0, requestValidator_1.default)(auth_validation_1.AuthValidation.registerSchema), auth_controller_1.AuthController.register);
// POST /api/v1/auth/login — public
authRoute.post("/login", (0, requestValidator_1.default)(auth_validation_1.AuthValidation.loginSchema), auth_controller_1.AuthController.login);
// POST /api/v1/auth/refresh — public (uses refresh token from cookie)
authRoute.post("/refresh", auth_controller_1.AuthController.refresh);
// POST /api/v1/auth/logout — public
authRoute.post("/logout", auth_controller_1.AuthController.logout);
exports.default = authRoute;
