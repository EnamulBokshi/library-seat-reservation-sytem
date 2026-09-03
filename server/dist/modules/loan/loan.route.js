"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loan_controller_1 = require("./loan.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const loan_validation_1 = require("./loan.validation");
const loanRoute = (0, express_1.Router)();
// Student Endpoints
loanRoute.post("/request", (0, authCheck_1.default)("student", "admin", "librarian"), (0, requestValidator_1.default)(loan_validation_1.LoanValidation.createLoanRequestSchema), loan_controller_1.LoanController.requestLoan);
loanRoute.get("/my-loans", (0, authCheck_1.default)("student", "admin", "librarian"), loan_controller_1.LoanController.getMyLoans);
loanRoute.post("/:id/renew", (0, authCheck_1.default)("student", "admin", "librarian"), loan_controller_1.LoanController.renewLoan);
// Admin / Librarian Circulation Desk Endpoints
loanRoute.get("/stats", (0, authCheck_1.default)("admin", "librarian"), loan_controller_1.LoanController.getCirculationStats);
loanRoute.get("/", (0, authCheck_1.default)("admin", "librarian"), loan_controller_1.LoanController.getAllLoans);
loanRoute.post("/direct-issue", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(loan_validation_1.LoanValidation.directIssueSchema), loan_controller_1.LoanController.directIssueLoan);
loanRoute.patch("/:id/status", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(loan_validation_1.LoanValidation.updateLoanStatusSchema), loan_controller_1.LoanController.updateLoanStatus);
loanRoute.post("/:id/return", (0, authCheck_1.default)("admin", "librarian"), loan_controller_1.LoanController.returnBook);
loanRoute.post("/:id/admin-renew", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(loan_validation_1.LoanValidation.adminRenewSchema), loan_controller_1.LoanController.adminRenewLoan);
exports.default = loanRoute;
