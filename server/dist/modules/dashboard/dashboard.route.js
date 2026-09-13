"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("./dashboard.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const dashboardRoute = (0, express_1.Router)();
// GET /api/v1/dashboard/badges — counters for the workspace navigation
dashboardRoute.get("/badges", (0, authCheck_1.default)(), dashboard_controller_1.DashboardController.getNavBadgeCounts);
exports.default = dashboardRoute;
