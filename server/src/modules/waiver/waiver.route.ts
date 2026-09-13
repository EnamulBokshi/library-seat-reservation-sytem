import { Router } from "express";
import { WaiverController } from "./waiver.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { WaiverValidation } from "./waiver.validation";

const waiverRoute: Router = Router();

// POST /api/v1/waiver — faculty petitions to clear a student's fine
waiverRoute.post(
    "/",
    authCheck("faculty"),
    requestValidator(WaiverValidation.createWaiverRequestSchema),
    WaiverController.createWaiverRequest
);

// GET /api/v1/waiver/lookup?identifier= — a student's petitionable fines
waiverRoute.get("/lookup", authCheck("faculty"), WaiverController.lookupStudentFines);

// GET /api/v1/waiver/my — the requesting faculty member's own petitions
waiverRoute.get("/my", authCheck("faculty"), WaiverController.getMyWaiverRequests);

// GET /api/v1/waiver — review queue
waiverRoute.get("/", authCheck("admin", "librarian"), WaiverController.getAllWaiverRequests);

// PATCH /api/v1/waiver/:id/decide — approve or reject a petition
waiverRoute.patch(
    "/:id/decide",
    authCheck("admin"),
    requestValidator(WaiverValidation.decideWaiverRequestSchema),
    WaiverController.decideWaiverRequest
);

export default waiverRoute;
