import { Router } from "express";
import { ReportController } from "./report.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { ReportValidation } from "./report.validation";

const reportRoute: Router = Router();

// GET /api/v1/report/my — the reporter's own reports, before "/:id" shadows it
reportRoute.get("/my", authCheck(), ReportController.getMyReports);

// POST /api/v1/report — file a report
reportRoute.post(
    "/",
    authCheck("student", "faculty", "admin", "librarian"),
    requestValidator(ReportValidation.createReportSchema),
    ReportController.createReport
);

// GET /api/v1/report — the staff triage queue
reportRoute.get("/", authCheck("admin", "librarian"), ReportController.getAllReports);

// GET /api/v1/report/:id — one report; reporters may only open their own
reportRoute.get("/:id", authCheck(), ReportController.getReportById);

// PATCH /api/v1/report/:id/status — move a report along and reply to the reporter
reportRoute.patch(
    "/:id/status",
    authCheck("admin", "librarian"),
    requestValidator(ReportValidation.updateReportStatusSchema),
    ReportController.updateReportStatus
);

export default reportRoute;
