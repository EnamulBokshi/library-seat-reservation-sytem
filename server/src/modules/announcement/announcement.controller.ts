import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import AppError from "../../helpers/AppError";
import { AnnouncementService } from "./announcement.service";
import { Role } from "../../generated/enums";
import { IAnnouncementFilterOptions } from "./announcement.interface";

const requireUserId = (req: Request): string => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};

/** Query string flags arrive as text; treat only the literal "false" as false. */
const parseBooleanQuery = (value: unknown): boolean | undefined =>
    value === undefined ? undefined : value !== "false";

const readFilters = (req: Request): IAnnouncementFilterOptions => ({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    audience: req.query.audience as string | undefined,
    priority: req.query.priority as string | undefined,
    isActive: parseBooleanQuery(req.query.isActive),
    searchTerm: req.query.searchTerm as string | undefined,
    sortBy: req.query.sortBy as IAnnouncementFilterOptions["sortBy"],
    sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
});

const createAnnouncement = catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.createAnnouncement(requireUserId(req), req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Notice published successfully",
        data: result,
    });
});

const getMyAnnouncements = catchAsync(async (req: Request, res: Response) => {
    const role = req.user?.role as Role;
    const result = await AnnouncementService.getMyAnnouncements(role, readFilters(req));

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Notices retrieved successfully",
        data: result.announcements,
        meta: result.meta,
    });
});

const getAllAnnouncements = catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.getAllAnnouncements(readFilters(req));

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Notices retrieved successfully",
        data: result.announcements,
        meta: result.meta,
    });
});

const getAnnouncementById = catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.getAnnouncementById(String(req.params.id));

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Notice retrieved successfully",
        data: result,
    });
});

const updateAnnouncement = catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.updateAnnouncement(String(req.params.id), req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Notice updated successfully",
        data: result,
    });
});

const retireAnnouncement = catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.retireAnnouncement(String(req.params.id));

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Notice retired. Readers no longer see it.",
        data: result,
    });
});

export const AnnouncementController = {
    createAnnouncement,
    getMyAnnouncements,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    retireAnnouncement,
};
