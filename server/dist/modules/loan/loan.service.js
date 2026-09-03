"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanService = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const http_status_1 = __importDefault(require("http-status"));
const setting_service_1 = require("../setting/setting.service");
/**
 * Student submits a request to borrow a book
 */
const requestLoan = async (userId, payload) => {
    const { bookId, notes } = payload;
    const book = await prisma_1.default.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isActive) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Book not found or is currently inactive.");
    }
    if (book.availableCopies < 1) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "All physical copies of this book are currently on loan.");
    }
    // Check if student already has this book requested or currently issued
    const existingActiveForBook = await prisma_1.default.bookLoan.findFirst({
        where: {
            userId,
            bookId,
            status: { in: ["requested", "issued", "overdue"] },
        },
    });
    if (existingActiveForBook) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, `You already have an active ${existingActiveForBook.status} loan for this book.`);
    }
    // Get dynamic policy settings
    const { maxBorrowLimit, borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
    // Count active borrowed books by this user
    const activeCount = await prisma_1.default.bookLoan.count({
        where: {
            userId,
            status: { in: ["requested", "issued", "overdue"] },
        },
    });
    if (activeCount >= maxBorrowLimit) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Borrow limit exceeded. You can only borrow up to ${maxBorrowLimit} books concurrently.`);
    }
    const borrowDate = new Date();
    const dueDate = new Date(borrowDate.getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
    const loan = await prisma_1.default.bookLoan.create({
        data: {
            bookId,
            userId,
            borrowDate,
            dueDate,
            status: "requested",
            notes: notes || undefined,
        },
        include: {
            book: true,
            user: {
                select: { id: true, name: true, email: true, studentId: true },
            },
        },
    });
    return loan;
};
/**
 * Admin / Librarian directly issues a book to a student
 */
const directIssueLoan = async (adminId, payload) => {
    const { bookId, studentIdentifier, notes } = payload;
    const book = await prisma_1.default.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isActive) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Book not found or is inactive.");
    }
    if (book.availableCopies < 1) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "No available copies in stock to issue.");
    }
    // Find user by studentId or email
    const user = await prisma_1.default.user.findFirst({
        where: {
            OR: [
                { studentId: studentIdentifier },
                { email: { equals: studentIdentifier, mode: "insensitive" } },
                { id: studentIdentifier },
            ],
            isActive: true,
        },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, `No active student found for "${studentIdentifier}".`);
    }
    const { maxBorrowLimit, borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
    const activeCount = await prisma_1.default.bookLoan.count({
        where: {
            userId: user.id,
            status: { in: ["issued", "overdue"] },
        },
    });
    if (activeCount >= maxBorrowLimit) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Student has reached the maximum borrowing limit of ${maxBorrowLimit} active books.`);
    }
    const borrowDate = new Date();
    const dueDate = payload.dueDate
        ? new Date(payload.dueDate)
        : new Date(borrowDate.getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
    // Execute in transaction: create loan and decrement availableCopies
    const result = await prisma_1.default.$transaction(async (tx) => {
        const loan = await tx.bookLoan.create({
            data: {
                bookId,
                userId: user.id,
                borrowDate,
                dueDate,
                status: "issued",
                approvedById: adminId,
                notes: notes || undefined,
            },
            include: {
                book: true,
                user: {
                    select: { id: true, name: true, email: true, studentId: true },
                },
            },
        });
        await tx.book.update({
            where: { id: bookId },
            data: {
                availableCopies: { decrement: 1 },
            },
        });
        return loan;
    });
    return result;
};
/**
 * Admin / Librarian updates loan status (Approve Request, Reject, Cancel)
 */
const updateLoanStatus = async (adminId, loanId, payload) => {
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: loanId },
        include: { book: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    const targetStatus = payload.status;
    const currentStatus = loan.status;
    if (currentStatus === targetStatus) {
        return loan;
    }
    const { borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
    const result = await prisma_1.default.$transaction(async (tx) => {
        // If approving a requested loan to issued:
        if (currentStatus === "requested" && targetStatus === "issued") {
            if (loan.book.availableCopies < 1) {
                throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "No copies available to issue.");
            }
            const borrowDate = new Date();
            const dueDate = new Date(borrowDate.getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
            await tx.book.update({
                where: { id: loan.bookId },
                data: { availableCopies: { decrement: 1 } },
            });
            return tx.bookLoan.update({
                where: { id: loanId },
                data: {
                    status: "issued",
                    borrowDate,
                    dueDate,
                    approvedById: adminId,
                    notes: payload.notes || loan.notes,
                },
                include: {
                    book: true,
                    user: { select: { id: true, name: true, email: true, studentId: true } },
                },
            });
        }
        // If marking as returned from issued / overdue:
        if ((currentStatus === "issued" || currentStatus === "overdue") && targetStatus === "returned") {
            await tx.book.update({
                where: { id: loan.bookId },
                data: { availableCopies: { increment: 1 } },
            });
            return tx.bookLoan.update({
                where: { id: loanId },
                data: {
                    status: "returned",
                    returnDate: new Date(),
                    notes: payload.notes || loan.notes,
                },
                include: {
                    book: true,
                    user: { select: { id: true, name: true, email: true, studentId: true } },
                },
            });
        }
        // Otherwise standard status update (e.g. rejected, cancelled)
        return tx.bookLoan.update({
            where: { id: loanId },
            data: {
                status: targetStatus,
                notes: payload.notes || loan.notes,
            },
            include: {
                book: true,
                user: { select: { id: true, name: true, email: true, studentId: true } },
            },
        });
    });
    return result;
};
/**
 * Return a book (Restores book inventory count)
 */
const returnBook = async (adminId, loanId) => {
    return updateLoanStatus(adminId, loanId, { status: "returned" });
};
/**
 * Student self-service renewal of their borrowed book
 */
const renewLoan = async (userId, loanId) => {
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: loanId },
        include: { book: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    if (loan.userId !== userId) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "You can only renew your own borrowed books.");
    }
    if (loan.status !== "issued") {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Cannot renew a loan with status '${loan.status}'. Only actively issued loans can be renewed.`);
    }
    const { borrowPeriodDays, maxRenewalLimit } = await setting_service_1.SettingService.getBorrowConfig();
    if (loan.renewCount >= maxRenewalLimit) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Renewal limit reached. You have already renewed this book ${loan.renewCount}/${maxRenewalLimit} times.`);
    }
    // Check if overdue
    const now = new Date();
    if (now > loan.dueDate) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This loan is overdue and cannot be renewed automatically. Please consult library staff.");
    }
    // Extend due date from current dueDate by borrowPeriodDays
    const newDueDate = new Date(loan.dueDate.getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
    const updated = await prisma_1.default.bookLoan.update({
        where: { id: loanId },
        data: {
            dueDate: newDueDate,
            renewCount: { increment: 1 },
        },
        include: {
            book: true,
            user: { select: { id: true, name: true, email: true, studentId: true } },
        },
    });
    return updated;
};
/**
 * Admin manual renewal / due date extension
 */
const adminRenewLoan = async (adminId, loanId, payload) => {
    const loan = await prisma_1.default.bookLoan.findUnique({ where: { id: loanId } });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    const { borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
    const daysToAdd = payload.extendedDays || borrowPeriodDays;
    const currentDue = new Date(loan.dueDate);
    const baseTime = currentDue > new Date() ? currentDue.getTime() : new Date().getTime();
    const newDueDate = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000);
    const updated = await prisma_1.default.bookLoan.update({
        where: { id: loanId },
        data: {
            dueDate: newDueDate,
            status: "issued", // in case it was flagged overdue
            renewCount: { increment: 1 },
            notes: payload.notes || loan.notes,
            approvedById: adminId,
        },
        include: {
            book: true,
            user: { select: { id: true, name: true, email: true, studentId: true } },
        },
    });
    return updated;
};
/**
 * Get student's personal loans and borrow status
 */
const getMyLoans = async (userId) => {
    const { maxBorrowLimit, maxRenewalLimit } = await setting_service_1.SettingService.getBorrowConfig();
    const loans = await prisma_1.default.bookLoan.findMany({
        where: { userId },
        include: {
            book: true,
        },
        orderBy: { createdAt: "desc" },
    });
    // Calculate stats
    const activeLoans = loans.filter((l) => l.status === "issued" || l.status === "overdue");
    const pendingRequests = loans.filter((l) => l.status === "requested");
    const returnedHistory = loans.filter((l) => l.status === "returned");
    return {
        quota: {
            maxBorrowLimit,
            maxRenewalLimit,
            currentlyBorrowed: activeLoans.length,
            pendingRequests: pendingRequests.length,
            availableQuota: Math.max(0, maxBorrowLimit - (activeLoans.length + pendingRequests.length)),
        },
        activeLoans,
        pendingRequests,
        returnedHistory,
        allLoans: loans,
    };
};
/**
 * Get all loans with filters for Admin Circulation Desk
 */
const getAllLoans = async (options) => {
    const { status: statusFilter, userId, bookId, searchTerm, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", } = options;
    const skip = (page - 1) * limit;
    const whereConditions = [];
    if (statusFilter && statusFilter !== "all") {
        if (statusFilter === "active") {
            whereConditions.push({ status: { in: ["issued", "overdue"] } });
        }
        else {
            whereConditions.push({ status: statusFilter });
        }
    }
    if (userId) {
        whereConditions.push({ userId });
    }
    if (bookId) {
        whereConditions.push({ bookId });
    }
    if (searchTerm) {
        whereConditions.push({
            OR: [
                { user: { name: { contains: searchTerm, mode: "insensitive" } } },
                { user: { email: { contains: searchTerm, mode: "insensitive" } } },
                { user: { studentId: { contains: searchTerm, mode: "insensitive" } } },
                { book: { title: { contains: searchTerm, mode: "insensitive" } } },
                { book: { isbn: { contains: searchTerm, mode: "insensitive" } } },
                { book: { author: { contains: searchTerm, mode: "insensitive" } } },
            ],
        });
    }
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};
    const [loans, total] = await Promise.all([
        prisma_1.default.bookLoan.findMany({
            where,
            skip,
            take: limit,
            include: {
                book: true,
                user: {
                    select: { id: true, name: true, email: true, studentId: true },
                },
            },
            orderBy: { [sortBy]: sortOrder },
        }),
        prisma_1.default.bookLoan.count({ where }),
    ]);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: loans,
    };
};
/**
 * Get summary stats for the circulation desk
 */
const getCirculationStats = async () => {
    const now = new Date();
    const [totalBooks, activeLoans, pendingRequests, overdueLoans, totalReturned] = await Promise.all([
        prisma_1.default.book.count({ where: { isActive: true } }),
        prisma_1.default.bookLoan.count({ where: { status: "issued" } }),
        prisma_1.default.bookLoan.count({ where: { status: "requested" } }),
        prisma_1.default.bookLoan.count({
            where: {
                status: "issued",
                dueDate: { lt: now },
            },
        }),
        prisma_1.default.bookLoan.count({ where: { status: "returned" } }),
    ]);
    return {
        totalBooks,
        activeLoans,
        pendingRequests,
        overdueLoans,
        totalReturned,
    };
};
exports.LoanService = {
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
