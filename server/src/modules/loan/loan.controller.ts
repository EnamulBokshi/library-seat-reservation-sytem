import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { LoanService } from "./loan.service";

const lookupBook = catchAsync(async (req: Request, res: Response) => {
  const result = await LoanService.lookupBook(req.params.identifier as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book found successfully.",
    data: result,
  });
});

const lookupStudent = catchAsync(async (req: Request, res: Response) => {
  const result = await LoanService.lookupStudent(req.params.identifier as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Student eligibility verified.",
    data: result,
  });
});

const requestLoan = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await LoanService.requestLoan(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Borrow request submitted successfully. Please pick up the book from the library circulation desk.",
    data: result,
  });
});

const directIssueLoan = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.userId;
  const result = await LoanService.directIssueLoan(adminId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Book issued successfully to student.",
    data: result,
  });
});

const updateLoanStatus = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.userId;
  const result = await LoanService.updateLoanStatus(req.params.id as string, req.body, adminId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Loan status updated to '${req.body.status}' successfully.`,
    data: result,
  });
});

const returnBook = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.userId;
  const result = await LoanService.returnLoan(req.params.id as string, adminId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.fineAmount > 0
      ? `Book returned with ${result.daysOverdue} days overdue. Fine of ${result.fineAmount} BDT recorded.`
      : "Book successfully marked as returned and physical inventory restored.",
    data: result,
  });
});

const payLoanFine = catchAsync(async (req: Request, res: Response) => {
  const librarianId = req.user.userId;
  const result = await LoanService.payLoanFine(req.params.id as string, req.body, librarianId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Fine payment of ${result.fineAmount} BDT recorded via ${result.paymentMethod}. Student borrowing access restored.`,
    data: result,
  });
});

const renewLoan = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await LoanService.renewLoan(req.params.id as string, userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Loan renewed successfully! New due date: ${new Date(result.dueDate).toLocaleDateString()}`,
    data: result,
  });
});

const adminRenewLoan = catchAsync(async (req: Request, res: Response) => {
  const result = await LoanService.adminRenewLoan(req.params.id as string, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Loan due date extended successfully.",
    data: result,
  });
});

const getMyLoans = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await LoanService.getMyLoans(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Student loan records retrieved successfully.",
    data: result,
  });
});

const getAllLoans = catchAsync(async (req: Request, res: Response) => {
  const options = {
    status: req.query.status as any,
    fineStatus: req.query.fineStatus as any,
    userId: req.query.userId as string,
    bookId: req.query.bookId as string,
    searchTerm: req.query.searchTerm as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    sortBy: (req.query.sortBy as string) || "createdAt",
    sortOrder: ((req.query.sortOrder as string) || "desc") as "asc" | "desc",
  };

  const result = await LoanService.getAllLoans(options);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Circulation loan records retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getCirculationStats = catchAsync(async (req: Request, res: Response) => {
  const result = await LoanService.getCirculationStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Circulation statistics retrieved successfully.",
    data: result,
  });
});

export const LoanController = {
  lookupBook,
  lookupStudent,
  requestLoan,
  directIssueLoan,
  updateLoanStatus,
  returnBook,
  payLoanFine,
  renewLoan,
  adminRenewLoan,
  getMyLoans,
  getAllLoans,
  getCirculationStats,
};
