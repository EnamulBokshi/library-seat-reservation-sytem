"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fine_controller_1 = require("./fine.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const fine_validation_1 = require("./fine.validation");
const fineRoute = (0, express_1.Router)();
// All fine management endpoints require admin or librarian role
fineRoute.use((0, authCheck_1.default)("admin", "librarian"));
fineRoute.get("/stats", fine_controller_1.FineController.getStats);
fineRoute.get("/", fine_controller_1.FineController.getAllFines);
fineRoute.post("/:source/:id/pay", (0, requestValidator_1.default)(fine_validation_1.FineValidation.payFineSchema), fine_controller_1.FineController.payFine);
fineRoute.post("/:source/:id/waive", (0, requestValidator_1.default)(fine_validation_1.FineValidation.waiveFineSchema), fine_controller_1.FineController.waiveFine);
exports.default = fineRoute;
