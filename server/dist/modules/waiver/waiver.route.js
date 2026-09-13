"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const waiver_controller_1 = require("./waiver.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const waiver_validation_1 = require("./waiver.validation");
const waiverRoute = (0, express_1.Router)();
// POST /api/v1/waiver — faculty petitions to clear a student's fine
waiverRoute.post("/", (0, authCheck_1.default)("faculty"), (0, requestValidator_1.default)(waiver_validation_1.WaiverValidation.createWaiverRequestSchema), waiver_controller_1.WaiverController.createWaiverRequest);
// GET /api/v1/waiver/lookup?identifier= — a student's petitionable fines
waiverRoute.get("/lookup", (0, authCheck_1.default)("faculty"), waiver_controller_1.WaiverController.lookupStudentFines);
// GET /api/v1/waiver/my — the requesting faculty member's own petitions
waiverRoute.get("/my", (0, authCheck_1.default)("faculty"), waiver_controller_1.WaiverController.getMyWaiverRequests);
// GET /api/v1/waiver — review queue
waiverRoute.get("/", (0, authCheck_1.default)("admin", "librarian"), waiver_controller_1.WaiverController.getAllWaiverRequests);
// PATCH /api/v1/waiver/:id/decide — approve or reject a petition
waiverRoute.patch("/:id/decide", (0, authCheck_1.default)("admin"), (0, requestValidator_1.default)(waiver_validation_1.WaiverValidation.decideWaiverRequestSchema), waiver_controller_1.WaiverController.decideWaiverRequest);
exports.default = waiverRoute;
