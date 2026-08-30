import { Router } from "express";
import { LoanController } from "./loan.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { LoanValidation } from "./loan.validation";

const loanRoute: Router = Router();

// Student Endpoints
loanRoute.post(
  "/request",
  authCheck("student", "admin", "librarian"),
  requestValidator(LoanValidation.createLoanRequestSchema),
  LoanController.requestLoan
);

loanRoute.get(
  "/my-loans",
  authCheck("student", "admin", "librarian"),
  LoanController.getMyLoans
);

loanRoute.post(
  "/:id/renew",
  authCheck("student", "admin", "librarian"),
  LoanController.renewLoan
);

// Admin / Librarian Circulation Desk Endpoints
loanRoute.get(
  "/stats",
  authCheck("admin", "librarian"),
  LoanController.getCirculationStats
);

loanRoute.get(
  "/",
  authCheck("admin", "librarian"),
  LoanController.getAllLoans
);

loanRoute.post(
  "/direct-issue",
  authCheck("admin", "librarian"),
  requestValidator(LoanValidation.directIssueSchema),
  LoanController.directIssueLoan
);

loanRoute.patch(
  "/:id/status",
  authCheck("admin", "librarian"),
  requestValidator(LoanValidation.updateLoanStatusSchema),
  LoanController.updateLoanStatus
);

loanRoute.post(
  "/:id/return",
  authCheck("admin", "librarian"),
  LoanController.returnBook
);

loanRoute.post(
  "/:id/admin-renew",
  authCheck("admin", "librarian"),
  requestValidator(LoanValidation.adminRenewSchema),
  LoanController.adminRenewLoan
);

export default loanRoute;
