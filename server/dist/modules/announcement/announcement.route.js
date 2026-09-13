"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const announcement_controller_1 = require("./announcement.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const announcement_validation_1 = require("./announcement.validation");
const announcementRoute = (0, express_1.Router)();
// GET /api/v1/announcement/my — the reader's feed, before "/:id" can shadow it
announcementRoute.get("/my", (0, authCheck_1.default)(), announcement_controller_1.AnnouncementController.getMyAnnouncements);
// GET /api/v1/announcement — full listing, including retired and scheduled
announcementRoute.get("/", (0, authCheck_1.default)("admin", "librarian"), announcement_controller_1.AnnouncementController.getAllAnnouncements);
// POST /api/v1/announcement — publish a notice
announcementRoute.post("/", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(announcement_validation_1.AnnouncementValidation.createAnnouncementSchema), announcement_controller_1.AnnouncementController.createAnnouncement);
// GET /api/v1/announcement/:id — one notice
announcementRoute.get("/:id", (0, authCheck_1.default)(), announcement_controller_1.AnnouncementController.getAnnouncementById);
// PATCH /api/v1/announcement/:id — edit or schedule a notice
announcementRoute.patch("/:id", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(announcement_validation_1.AnnouncementValidation.updateAnnouncementSchema), announcement_controller_1.AnnouncementController.updateAnnouncement);
// DELETE /api/v1/announcement/:id — retire a notice (kept for the record)
announcementRoute.delete("/:id", (0, authCheck_1.default)("admin", "librarian"), announcement_controller_1.AnnouncementController.retireAnnouncement);
exports.default = announcementRoute;
