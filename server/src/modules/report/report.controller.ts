import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import AppError from "../../helpers/AppError";
import { ReportService } from "./report.service";
import { Role } from "../../generated/enums";
import { IReportFilterOptions } from "./report.interface";

const requireUserId = (req: Request): string => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};

const readFilters = (req: Request): IReportFilterOptions => ({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as string | undefined,
    category: req.query.category as string | undefined,
    priority: req.query.priority as string | undefined,
    searchTerm: req.query.searchTerm as string | undefined,
    sortBy: req.query.sortBy as IReportFilterOptions["sortBy"],
    sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
});

const createReport = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.createReport(requireUserId(req), req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Report submitted. The library team has been notified.",
        data: result,
    });
});

const getMyReports = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.getMyReports(requireUserId(req), readFilters(req));

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Your reports retrieved successfully",
        data: result.reports,
        meta: result.meta,
    });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.getAllReports(readFilters(req));

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Reports retrieved successfully",
        data: result.reports,
        meta: result.meta,
    });
});

const getReportById = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.getReportById(
        String(req.params.id),
        requireUserId(req),
        req.user?.role as Role
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Report retrieved successfully",
        data: result,
    });
});

const updateReportStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await ReportService.updateReportStatus(
        String(req.params.id),
        requireUserId(req),
        req.body
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: `Report marked as ${result.status}`,
        data: result,
    });
});

export const ReportController = {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    updateReportStatus,
};
