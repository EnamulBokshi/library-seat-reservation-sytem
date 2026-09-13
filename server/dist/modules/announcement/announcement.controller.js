"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const announcement_service_1 = require("./announcement.service");
const requireUserId = (req) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized");
    }
    return userId;
};
/** Query string flags arrive as text; treat only the literal "false" as false. */
const parseBooleanQuery = (value) => value === undefined ? undefined : value !== "false";
const readFilters = (req) => ({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    audience: req.query.audience,
    priority: req.query.priority,
    isActive: parseBooleanQuery(req.query.isActive),
    searchTerm: req.query.searchTerm,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
});
const createAnnouncement = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await announcement_service_1.AnnouncementService.createAnnouncement(requireUserId(req), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Notice published successfully",
        data: result,
    });
});
const getMyAnnouncements = (0, CatchAsync_1.default)(async (req, res) => {
    const role = req.user?.role;
    const result = await announcement_service_1.AnnouncementService.getMyAnnouncements(role, readFilters(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Notices retrieved successfully",
        data: result.announcements,
        meta: result.meta,
    });
});
const getAllAnnouncements = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await announcement_service_1.AnnouncementService.getAllAnnouncements(readFilters(req));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Notices retrieved successfully",
        data: result.announcements,
        meta: result.meta,
    });
});
const getAnnouncementById = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await announcement_service_1.AnnouncementService.getAnnouncementById(String(req.params.id));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Notice retrieved successfully",
        data: result,
    });
});
const updateAnnouncement = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await announcement_service_1.AnnouncementService.updateAnnouncement(String(req.params.id), req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Notice updated successfully",
        data: result,
    });
});
const retireAnnouncement = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await announcement_service_1.AnnouncementService.retireAnnouncement(String(req.params.id));
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Notice retired. Readers no longer see it.",
        data: result,
    });
});
exports.AnnouncementController = {
    createAnnouncement,
    getMyAnnouncements,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    retireAnnouncement,
};
