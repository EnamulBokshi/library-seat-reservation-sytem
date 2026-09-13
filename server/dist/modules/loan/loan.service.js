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
const email_service_1 = require("../../services/email.service");
const enums_1 = require("../../generated/enums");
/**
 * Checks if a student has any unpaid library fines.
 * If unpaid dues exist, throws 403 Forbidden to lock borrowing.
 */
const checkStudentBorrowEligibility = async (userId) => {
    const unpaidLoans = await prisma_1.default.bookLoan.findMany({
        where: {
            userId,
            fineStatus: enums_1.FineStatus.unpaid,
            fineAmount: { gt: 0 },
        },
        include: {
            book: { select: { title: true } },
        },
    });
    if (unpaidLoans.length > 0) {
        const totalDue = unpaidLoans.reduce((sum, loan) => sum + loan.fineAmount, 0);
        const bookTitles = unpaidLoans.map((l) => `"${l.book.title}" (${l.fineAmount} BDT)`).join(", ");
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, `Borrowing suspended: You have unpaid overdue fines totaling ${totalDue} BDT for: ${bookTitles}. Please clear your dues at the circulation desk (Cash / Bank Chalan) to restore borrowing privileges.`);
    }
};
/**
 * Fast Lookup Book by Barcode, ISBN, Call Number, or UUID
 */
const lookupBook = async (identifier) => {
    const cleanId = identifier.trim();
    const book = await prisma_1.default.book.findFirst({
        where: {
            OR: [
                { id: cleanId },
                { barcode: cleanId },
                { isbn: cleanId },
                { callNumber: cleanId },
            ],
            isActive: true,
        },
        include: {
            loans: {
                where: { status: { in: [enums_1.LoanStatus.issued, enums_1.LoanStatus.overdue] } },
                select: { id: true, userId: true, dueDate: true },
            },
        },
    });
    if (!book) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, `No active book found matching identifier "${identifier}".`);
    }
    return book;
};
/**
 * Fast Lookup Student by Student ID, Email, or UUID with live eligibility status
 */
const lookupStudent = async (identifier) => {
    const cleanId = identifier.trim();
    const student = await prisma_1.default.user.findFirst({
        where: {
            OR: [
                { id: cleanId },
                { studentId: cleanId },
                { email: { equals: cleanId, mode: "insensitive" } },
            ],
        },
        include: {
            loans: {
                where: {
                    OR: [
                        { status: { in: [enums_1.LoanStatus.requested, enums_1.LoanStatus.issued, enums_1.LoanStatus.overdue] } },
                        { fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
                    ],
                },
                include: {
                    book: true,
                },
            },
        },
    });
    if (!student) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, `No registered student found matching "${identifier}".`);
    }
    const { maxBorrowLimit } = await setting_service_1.SettingService.getBorrowConfig();
    const activeLoans = student.loans.filter((l) => l.status === enums_1.LoanStatus.issued || l.status === enums_1.LoanStatus.overdue);
    const pendingRequests = student.loans.filter((l) => l.status === enums_1.LoanStatus.requested);
    const unpaidFines = student.loans.filter((l) => l.fineStatus === enums_1.FineStatus.unpaid && l.fineAmount > 0);
    const totalUnpaidFineBDT = unpaidFines.reduce((sum, l) => sum + l.fineAmount, 0);
    const currentlyBorrowed = activeLoans.length + pendingRequests.length;
    const availableQuota = Math.max(0, maxBorrowLimit - currentlyBorrowed);
    const isEligible = unpaidFines.length === 0 && availableQuota > 0;
    return {
        student: {
            id: student.id,
            name: student.name,
            email: student.email,
            studentId: student.studentId,
            role: student.role,
        },
        activeLoans,
        pendingRequests,
        unpaidFines,
        stats: {
            maxBorrowLimit,
            currentlyBorrowed,
            availableQuota,
            totalUnpaidFineBDT,
            isEligible,
            ineligibilityReason: unpaidFines.length > 0
                ? `Outstanding fine of ${totalUnpaidFineBDT} BDT must be cleared.`
                : availableQuota <= 0
                    ? `Max borrow quota (${maxBorrowLimit} books) reached.`
                    : null,
        },
    };
};
/**
 * Student submits an online borrow request
 */
const requestLoan = async (userId, payload) => {
    const { bookId, notes } = payload;
    // 1. Verify student has zero unpaid dues
    await checkStudentBorrowEligibility(userId);
    const book = await prisma_1.default.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isActive) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Book not found or is currently inactive.");
    }
    if (book.availableCopies < 1) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "All physical copies of this book are currently on loan.");
    }
    // Check if student already has this book active
    const existingActiveForBook = await prisma_1.default.bookLoan.findFirst({
        where: {
            userId,
            bookId,
            status: { in: [enums_1.LoanStatus.requested, enums_1.LoanStatus.issued, enums_1.LoanStatus.overdue] },
        },
    });
    if (existingActiveForBook) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, `You already have an active ${existingActiveForBook.status} loan record for this book.`);
    }
    const { maxBorrowLimit, borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
    const activeCount = await prisma_1.default.bookLoan.count({
        where: {
            userId,
            status: { in: [enums_1.LoanStatus.requested, enums_1.LoanStatus.issued, enums_1.LoanStatus.overdue] },
        },
    });
    if (activeCount >= maxBorrowLimit) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Borrow limit reached. You can borrow at most ${maxBorrowLimit} books concurrently.`);
    }
    const borrowDate = new Date();
    const dueDate = new Date(borrowDate.getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
    const loan = await prisma_1.default.bookLoan.create({
        data: {
            bookId,
            userId,
            borrowDate,
            dueDate,
            status: enums_1.LoanStatus.requested,
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
 * Admin / Librarian directly issues a physical book by Barcode / Student ID
 */
const directIssueLoan = async (adminId, payload) => {
    const { bookIdentifier, studentIdentifier, dueDate: customDueDate, notes } = payload;
    // 1. Resolve Book
    const book = await lookupBook(bookIdentifier);
    if (book.availableCopies < 1) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Cannot issue: All copies of "${book.title}" are currently checked out.`);
    }
    // 2. Resolve Student
    const { student, unpaidFines, stats } = await lookupStudent(studentIdentifier);
    if (unpaidFines.length > 0) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, `Cannot issue book: Student ${student.name} (${student.studentId || student.email}) has ${stats.totalUnpaidFineBDT} BDT in unpaid overdue fines. Please collect payment before issuing.`);
    }
    if (stats.availableQuota < 1) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Student has reached the maximum borrowing limit (${stats.maxBorrowLimit} books).`);
    }
    // 3. Check if student already holds a copy of this book
    const existingCopy = await prisma_1.default.bookLoan.findFirst({
        where: {
            userId: student.id,
            bookId: book.id,
            status: { in: [enums_1.LoanStatus.requested, enums_1.LoanStatus.issued, enums_1.LoanStatus.overdue] },
        },
    });
    if (existingCopy) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, `Student already has an active loan (${existingCopy.status}) for "${book.title}".`);
    }
    const { borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
    const fineConfig = await setting_service_1.SettingService.getFineConfig();
    const borrowDate = new Date();
    const dueDate = customDueDate
        ? new Date(customDueDate)
        : new Date(borrowDate.getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
    // 4. Atomic Transaction: create loan & decrement inventory
    const [loan] = await prisma_1.default.$transaction([
        prisma_1.default.bookLoan.create({
            data: {
                bookId: book.id,
                userId: student.id,
                borrowDate,
                dueDate,
                status: enums_1.LoanStatus.issued,
                approvedById: adminId,
                notes: notes || undefined,
            },
            include: {
                book: true,
                user: {
                    select: { id: true, name: true, email: true, studentId: true },
                },
            },
        }),
        prisma_1.default.book.update({
            where: { id: book.id },
            data: { availableCopies: { decrement: 1 } },
        }),
    ]);
    // 5. Dispatch Confirmation Email
    email_service_1.emailService.sendLoanConfirmationEmail({
        toEmail: student.email,
        studentName: student.name,
        bookTitle: book.title,
        bookAuthor: book.author,
        barcodeOrIsbn: book.barcode || book.isbn || undefined,
        block: book.block,
        shelfNumber: book.shelfNumber,
        borrowDateStr: borrowDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        dueDateStr: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        fineRatePerDay: fineConfig.defaultRate,
    }).catch((err) => console.error("[Loan Service] Failed to send confirmation email:", err));
    return loan;
};
/**
 * Admin updates loan status (Approve & Issue, Reject, Cancel)
 */
const updateLoanStatus = async (loanId, payload, adminId) => {
    const { status: targetStatus, notes } = payload;
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: loanId },
        include: { book: true, user: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    // Approving a requested loan -> transitions to issued
    if (targetStatus === enums_1.LoanStatus.issued && loan.status === enums_1.LoanStatus.requested) {
        // Check unpaid dues
        await checkStudentBorrowEligibility(loan.userId);
        if (loan.book.availableCopies < 1) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Cannot approve request: All physical copies of this book are currently on loan.");
        }
        const { borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
        const fineConfig = await setting_service_1.SettingService.getFineConfig();
        const borrowDate = new Date();
        const dueDate = new Date(borrowDate.getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
        const [updatedLoan] = await prisma_1.default.$transaction([
            prisma_1.default.bookLoan.update({
                where: { id: loanId },
                data: {
                    status: enums_1.LoanStatus.issued,
                    approvedById: adminId || undefined,
                    borrowDate,
                    dueDate,
                    notes: notes !== undefined ? notes : loan.notes,
                },
                include: {
                    book: true,
                    user: {
                        select: { id: true, name: true, email: true, studentId: true },
                    },
                },
            }),
            prisma_1.default.book.update({
                where: { id: loan.bookId },
                data: { availableCopies: { decrement: 1 } },
            }),
        ]);
        // Dispatch Confirmation Email
        email_service_1.emailService.sendLoanConfirmationEmail({
            toEmail: loan.user.email,
            studentName: loan.user.name,
            bookTitle: loan.book.title,
            bookAuthor: loan.book.author,
            barcodeOrIsbn: loan.book.barcode || loan.book.isbn || undefined,
            block: loan.book.block,
            shelfNumber: loan.book.shelfNumber,
            borrowDateStr: borrowDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            dueDateStr: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            fineRatePerDay: fineConfig.defaultRate,
        }).catch((err) => console.error("[Loan Service] Failed to send approval email:", err));
        return updatedLoan;
    }
    // Rejecting or cancelling
    const updatedLoan = await prisma_1.default.bookLoan.update({
        where: { id: loanId },
        data: {
            status: targetStatus,
            notes: notes !== undefined ? notes : loan.notes,
        },
        include: {
            book: true,
            user: {
                select: { id: true, name: true, email: true, studentId: true },
            },
        },
    });
    return updatedLoan;
};
/**
 * Return a borrowed book at the circulation desk
 * Automatically computes overdue fines if late and restores physical inventory
 */
const returnLoan = async (loanId, adminId) => {
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: loanId },
        include: { book: true, user: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    if (loan.status === enums_1.LoanStatus.returned) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This book has already been marked as returned.");
    }
    const returnDate = new Date();
    const { daysOverdue, fineAmount } = await setting_service_1.SettingService.calculateLoanFine(loan.dueDate, returnDate);
    // If overdue fine is incurred, set fineStatus to unpaid unless previously cleared
    const fineStatus = fineAmount > 0
        ? (loan.fineStatus === enums_1.FineStatus.paid ? enums_1.FineStatus.paid : enums_1.FineStatus.unpaid)
        : enums_1.FineStatus.none;
    const [updatedLoan] = await prisma_1.default.$transaction([
        prisma_1.default.bookLoan.update({
            where: { id: loanId },
            data: {
                status: enums_1.LoanStatus.returned,
                returnDate,
                fineAmount,
                fineStatus,
                approvedById: adminId || loan.approvedById,
            },
            include: {
                book: true,
                user: {
                    select: { id: true, name: true, email: true, studentId: true },
                },
            },
        }),
        prisma_1.default.book.update({
            where: { id: loan.bookId },
            data: { availableCopies: { increment: 1 } },
        }),
    ]);
    return {
        loan: updatedLoan,
        daysOverdue,
        fineAmount,
        fineStatus,
    };
};
/**
 * Admin settles and clears a student's overdue fine via Cash or Bank Chalan
 */
const payLoanFine = async (loanId, payload, librarianId) => {
    const { paymentMethod, chalanNumber, notes } = payload;
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: loanId },
        include: { book: true, user: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    if (loan.fineAmount <= 0) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This loan record has no outstanding fine.");
    }
    const finePaidAt = new Date();
    const updatedLoan = await prisma_1.default.bookLoan.update({
        where: { id: loanId },
        data: {
            fineStatus: enums_1.FineStatus.paid,
            paymentMethod: paymentMethod,
            chalanNumber: chalanNumber || null,
            finePaidAt,
            fineReceivedById: librarianId || null,
            notes: notes ? `${loan.notes ? loan.notes + " | " : ""}Payment: ${notes}` : loan.notes,
        },
        include: {
            book: true,
            user: {
                select: { id: true, name: true, email: true, studentId: true },
            },
        },
    });
    // Dispatch Fine Payment Receipt Email
    email_service_1.emailService.sendFinePaidReceiptEmail({
        toEmail: loan.user.email,
        studentName: loan.user.name,
        bookTitle: loan.book.title,
        fineAmount: loan.fineAmount,
        paymentMethod,
        chalanNumber: chalanNumber || undefined,
        paidDateStr: finePaidAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }).catch((err) => console.error("[Loan Service] Failed to send fine receipt email:", err));
    return updatedLoan;
};
/**
 * Student self-service online loan renewal
 */
const renewLoan = async (loanId, userId) => {
    // Check unpaid dues
    await checkStudentBorrowEligibility(userId);
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: loanId },
        include: { book: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    if (loan.userId !== userId) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "You do not have permission to renew this loan.");
    }
    if (loan.status !== enums_1.LoanStatus.issued) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Cannot renew loan with status "${loan.status}". Only active issued loans can be extended.`);
    }
    const now = new Date();
    if (new Date(loan.dueDate) < now) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Cannot renew an overdue book online. Please visit the library circulation desk to return and settle late dues.");
    }
    const { maxRenewalLimit, borrowPeriodDays } = await setting_service_1.SettingService.getBorrowConfig();
    if (loan.renewCount >= maxRenewalLimit) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Maximum renewal limit reached (${maxRenewalLimit} times). Please return the book to the library.`);
    }
    const newDueDate = new Date(new Date(loan.dueDate).getTime() + borrowPeriodDays * 24 * 60 * 60 * 1000);
    const updatedLoan = await prisma_1.default.bookLoan.update({
        where: { id: loanId },
        data: {
            dueDate: newDueDate,
            renewCount: { increment: 1 },
            warningEmailSent: false, // Reset warning flag for next period
        },
        include: {
            book: true,
            user: {
                select: { id: true, name: true, email: true, studentId: true },
            },
        },
    });
    return updatedLoan;
};
/**
 * Admin manual loan extension / renewal
 */
const adminRenewLoan = async (loanId, payload) => {
    const { extendedDays = 10, notes } = payload;
    const loan = await prisma_1.default.bookLoan.findUnique({
        where: { id: loanId },
        include: { book: true, user: true },
    });
    if (!loan) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Loan record not found.");
    }
    const baseDate = new Date(loan.dueDate) > new Date() ? new Date(loan.dueDate) : new Date();
    const newDueDate = new Date(baseDate.getTime() + extendedDays * 24 * 60 * 60 * 1000);
    const updatedLoan = await prisma_1.default.bookLoan.update({
        where: { id: loanId },
        data: {
            dueDate: newDueDate,
            renewCount: { increment: 1 },
            status: enums_1.LoanStatus.issued,
            warningEmailSent: false,
            notes: notes !== undefined ? notes : loan.notes,
        },
        include: {
            book: true,
            user: {
                select: { id: true, name: true, email: true, studentId: true },
            },
        },
    });
    return updatedLoan;
};
/**
 * Student personal loans, quotas, and fines summary
 */
const getMyLoans = async (userId) => {
    const { maxBorrowLimit, maxRenewalLimit } = await setting_service_1.SettingService.getBorrowConfig();
    const allLoans = await prisma_1.default.bookLoan.findMany({
        where: { userId },
        include: { book: true },
        orderBy: { createdAt: "desc" },
    });
    const activeLoans = allLoans.filter((loan) => loan.status === enums_1.LoanStatus.issued || loan.status === enums_1.LoanStatus.overdue);
    const pendingRequests = allLoans.filter((loan) => loan.status === enums_1.LoanStatus.requested);
    const returnedHistory = allLoans.filter((loan) => loan.status === enums_1.LoanStatus.returned);
    const unpaidFines = allLoans.filter((l) => l.fineStatus === enums_1.FineStatus.unpaid && l.fineAmount > 0);
    const paidFines = allLoans.filter((l) => l.fineStatus === enums_1.FineStatus.paid && l.fineAmount > 0);
    const totalDueBDT = unpaidFines.reduce((sum, l) => sum + l.fineAmount, 0);
    const totalPaidBDT = paidFines.reduce((sum, l) => sum + l.fineAmount, 0);
    const currentlyBorrowed = activeLoans.length + pendingRequests.length;
    const availableQuota = Math.max(0, maxBorrowLimit - currentlyBorrowed);
    return {
        quota: {
            maxBorrowLimit,
            maxRenewalLimit,
            currentlyBorrowed,
            pendingRequests: pendingRequests.length,
            availableQuota,
        },
        fines: {
            totalDueBDT,
            totalPaidBDT,
            hasUnpaidDues: unpaidFines.length > 0,
            unpaidFines,
            paidFines,
        },
        activeLoans,
        pendingRequests,
        returnedHistory,
        allLoans,
    };
};
/**
 * Get all loans with filters, search, and pagination (Admin / Librarian)
 */
const getAllLoans = async (options) => {
    const { status: filterStatus, fineStatus, userId, bookId, searchTerm, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", } = options;
    const whereClause = {};
    if (filterStatus && filterStatus !== "all") {
        if (filterStatus === "active") {
            whereClause.status = { in: [enums_1.LoanStatus.issued, enums_1.LoanStatus.overdue] };
        }
        else {
            whereClause.status = filterStatus;
        }
    }
    if (fineStatus) {
        whereClause.fineStatus = fineStatus;
    }
    if (userId) {
        whereClause.userId = userId;
    }
    if (bookId) {
        whereClause.bookId = bookId;
    }
    if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.trim();
        whereClause.OR = [
            { book: { title: { contains: q, mode: "insensitive" } } },
            { book: { author: { contains: q, mode: "insensitive" } } },
            { book: { barcode: { contains: q, mode: "insensitive" } } },
            { book: { isbn: { contains: q, mode: "insensitive" } } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { studentId: { contains: q, mode: "insensitive" } } },
            { chalanNumber: { contains: q, mode: "insensitive" } },
        ];
    }
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
        prisma_1.default.bookLoan.count({ where: whereClause }),
        prisma_1.default.bookLoan.findMany({
            where: whereClause,
            include: {
                book: true,
                user: {
                    select: { id: true, name: true, email: true, studentId: true },
                },
            },
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
        }),
    ]);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data,
    };
};
/**
 * Get comprehensive circulation & fine statistics
 */
const getCirculationStats = async () => {
    const [totalLoans, activeLoans, pendingRequests, overdueLoans, totalReturned, paidFinesAgg, unpaidFinesAgg, unpaidCount,] = await Promise.all([
        prisma_1.default.bookLoan.count(),
        prisma_1.default.bookLoan.count({ where: { status: enums_1.LoanStatus.issued } }),
        prisma_1.default.bookLoan.count({ where: { status: enums_1.LoanStatus.requested } }),
        prisma_1.default.bookLoan.count({ where: { status: enums_1.LoanStatus.overdue } }),
        prisma_1.default.bookLoan.count({ where: { status: enums_1.LoanStatus.returned } }),
        prisma_1.default.bookLoan.aggregate({
            where: { fineStatus: enums_1.FineStatus.paid },
            _sum: { fineAmount: true },
        }),
        prisma_1.default.bookLoan.aggregate({
            where: { fineStatus: enums_1.FineStatus.unpaid },
            _sum: { fineAmount: true },
        }),
        prisma_1.default.bookLoan.count({
            where: { fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
        }),
    ]);
    return {
        totalLoans,
        activeLoans,
        pendingRequests,
        overdueLoans,
        totalReturned,
        totalFinesCollected: paidFinesAgg._sum.fineAmount || 0,
        totalOutstandingFines: unpaidFinesAgg._sum.fineAmount || 0,
        unpaidFinesCount: unpaidCount,
    };
};
exports.LoanService = {
    lookupBook,
    lookupStudent,
    requestLoan,
    directIssueLoan,
    updateLoanStatus,
    returnLoan,
    payLoanFine,
    renewLoan,
    adminRenewLoan,
    getMyLoans,
    getAllLoans,
    getCirculationStats,
};
