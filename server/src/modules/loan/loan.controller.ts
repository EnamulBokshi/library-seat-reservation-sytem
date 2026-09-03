import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { LoanService } from "./loan.service";

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
  const result = await LoanService.updateLoanStatus(adminId, req.params.id as string, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Loan status updated to '${req.body.status}' successfully.`,
    data: result,
  });
});

const returnBook = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.userId;
  const result = await LoanService.returnBook(adminId, req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Book successfully marked as returned and inventory updated.",
    data: result,
  });
});

const renewLoan = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await LoanService.renewLoan(userId, req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Loan renewed successfully! New due date: ${new Date(result.dueDate).toLocaleDateString()}`,
    data: result,
  });
});

const adminRenewLoan = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.userId;
  const result = await LoanService.adminRenewLoan(adminId, req.params.id as string, req.body);

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
  requestLoan,
  directIssueLoan,
  updateLoanStatus,
  returnBook,
  renewLoan,
  adminRenewLoan,
  getMyLoans,
  getAllLoans,
  getCirculationStats,
};
