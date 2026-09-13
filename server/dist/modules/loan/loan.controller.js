"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const loan_service_1 = require("./loan.service");
const lookupBook = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await loan_service_1.LoanService.lookupBook(req.params.identifier);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Book found successfully.",
        data: result,
    });
});
const lookupStudent = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await loan_service_1.LoanService.lookupStudent(req.params.identifier);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Student eligibility verified.",
        data: result,
    });
});
const requestLoan = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await loan_service_1.LoanService.requestLoan(userId, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Borrow request submitted successfully. Please pick up the book from the library circulation desk.",
        data: result,
    });
});
const directIssueLoan = (0, CatchAsync_1.default)(async (req, res) => {
    const adminId = req.user.userId;
    const result = await loan_service_1.LoanService.directIssueLoan(adminId, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Book issued successfully to student.",
        data: result,
    });
});
const updateLoanStatus = (0, CatchAsync_1.default)(async (req, res) => {
    const adminId = req.user.userId;
    const result = await loan_service_1.LoanService.updateLoanStatus(req.params.id, req.body, adminId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `Loan status updated to '${req.body.status}' successfully.`,
        data: result,
    });
});
const returnBook = (0, CatchAsync_1.default)(async (req, res) => {
    const adminId = req.user.userId;
    const result = await loan_service_1.LoanService.returnLoan(req.params.id, adminId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: result.fineAmount > 0
            ? `Book returned with ${result.daysOverdue} days overdue. Fine of ${result.fineAmount} BDT recorded.`
            : "Book successfully marked as returned and physical inventory restored.",
        data: result,
    });
});
const payLoanFine = (0, CatchAsync_1.default)(async (req, res) => {
    const librarianId = req.user.userId;
    const result = await loan_service_1.LoanService.payLoanFine(req.params.id, req.body, librarianId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `Fine payment of ${result.fineAmount} BDT recorded via ${result.paymentMethod}. Student borrowing access restored.`,
        data: result,
    });
});
const renewLoan = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await loan_service_1.LoanService.renewLoan(req.params.id, userId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: `Loan renewed successfully! New due date: ${new Date(result.dueDate).toLocaleDateString()}`,
        data: result,
    });
});
const adminRenewLoan = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await loan_service_1.LoanService.adminRenewLoan(req.params.id, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Loan due date extended successfully.",
        data: result,
    });
});
const getMyLoans = (0, CatchAsync_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await loan_service_1.LoanService.getMyLoans(userId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Student loan records retrieved successfully.",
        data: result,
    });
});
const getAllLoans = (0, CatchAsync_1.default)(async (req, res) => {
    const options = {
        status: req.query.status,
        fineStatus: req.query.fineStatus,
        userId: req.query.userId,
        bookId: req.query.bookId,
        searchTerm: req.query.searchTerm,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: (req.query.sortOrder || "desc"),
    };
    const result = await loan_service_1.LoanService.getAllLoans(options);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Circulation loan records retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});
const getCirculationStats = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await loan_service_1.LoanService.getCirculationStats();
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Circulation statistics retrieved successfully.",
        data: result,
    });
});
exports.LoanController = {
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
