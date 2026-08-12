"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const checkin_controller_1 = require("./checkin.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const checkin_validation_1 = require("./checkin.validation");
const checkinRoute = (0, express_1.Router)();
// Entry/Exit Scan (Librarians and Admins only)
checkinRoute.post("/", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(checkin_validation_1.CheckInValidation.scanQRSchema), checkin_controller_1.CheckInController.scanQR);
exports.default = checkinRoute;
