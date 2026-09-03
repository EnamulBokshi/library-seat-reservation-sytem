"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schedule_controller_1 = require("./schedule.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const scheduleRoute = (0, express_1.Router)();
// GET all schedules for date range with booking statistics (Admin, Librarian)
scheduleRoute.get("/", (0, authCheck_1.default)("admin", "librarian"), schedule_controller_1.ScheduleController.getAdminSchedules);
// PATCH toggle open/closed state of an individual schedule slot (Admin, Librarian)
scheduleRoute.patch("/:id", (0, authCheck_1.default)("admin", "librarian"), schedule_controller_1.ScheduleController.toggleScheduleSlot);
// POST bulk toggle schedules across dates / slot types (Admin only)
scheduleRoute.post("/bulk-toggle", (0, authCheck_1.default)("admin"), schedule_controller_1.ScheduleController.bulkToggleSchedules);
// POST trigger rolling schedule generation for N days ahead (Admin only)
scheduleRoute.post("/generate", (0, authCheck_1.default)("admin"), schedule_controller_1.ScheduleController.generateSchedules);
exports.default = scheduleRoute;
