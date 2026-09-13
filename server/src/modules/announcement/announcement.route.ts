import { Router } from "express";
import { AnnouncementController } from "./announcement.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { AnnouncementValidation } from "./announcement.validation";

const announcementRoute: Router = Router();

// GET /api/v1/announcement/my — the reader's feed, before "/:id" can shadow it
announcementRoute.get("/my", authCheck(), AnnouncementController.getMyAnnouncements);

// GET /api/v1/announcement — full listing, including retired and scheduled
announcementRoute.get("/", authCheck("admin", "librarian"), AnnouncementController.getAllAnnouncements);

// POST /api/v1/announcement — publish a notice
announcementRoute.post(
    "/",
    authCheck("admin", "librarian"),
    requestValidator(AnnouncementValidation.createAnnouncementSchema),
    AnnouncementController.createAnnouncement
);

// GET /api/v1/announcement/:id — one notice
announcementRoute.get("/:id", authCheck(), AnnouncementController.getAnnouncementById);

// PATCH /api/v1/announcement/:id — edit or schedule a notice
announcementRoute.patch(
    "/:id",
    authCheck("admin", "librarian"),
    requestValidator(AnnouncementValidation.updateAnnouncementSchema),
    AnnouncementController.updateAnnouncement
);

// DELETE /api/v1/announcement/:id — retire a notice (kept for the record)
announcementRoute.delete("/:id", authCheck("admin", "librarian"), AnnouncementController.retireAnnouncement);

export default announcementRoute;
