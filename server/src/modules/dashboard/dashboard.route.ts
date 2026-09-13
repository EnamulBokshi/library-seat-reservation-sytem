import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import authCheck from "../../middleware/authCheck";

const dashboardRoute: Router = Router();

// GET /api/v1/dashboard/badges — counters for the workspace navigation
dashboardRoute.get("/badges", authCheck(), DashboardController.getNavBadgeCounts);

export default dashboardRoute;
