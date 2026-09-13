"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("./report.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const report_validation_1 = require("./report.validation");
const reportRoute = (0, express_1.Router)();
// GET /api/v1/report/my — the reporter's own reports, before "/:id" shadows it
reportRoute.get("/my", (0, authCheck_1.default)(), report_controller_1.ReportController.getMyReports);
// POST /api/v1/report — file a report
reportRoute.post("/", (0, authCheck_1.default)("student", "faculty", "admin", "librarian"), (0, requestValidator_1.default)(report_validation_1.ReportValidation.createReportSchema), report_controller_1.ReportController.createReport);
// GET /api/v1/report — the staff triage queue
reportRoute.get("/", (0, authCheck_1.default)("admin", "librarian"), report_controller_1.ReportController.getAllReports);
// GET /api/v1/report/:id — one report; reporters may only open their own
reportRoute.get("/:id", (0, authCheck_1.default)(), report_controller_1.ReportController.getReportById);
// PATCH /api/v1/report/:id/status — move a report along and reply to the reporter
reportRoute.patch("/:id/status", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(report_validation_1.ReportValidation.updateReportStatusSchema), report_controller_1.ReportController.updateReportStatus);
exports.default = reportRoute;
