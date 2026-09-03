import { Router } from "express";
import { ScheduleController } from "./schedule.controller";
import authCheck from "../../middleware/authCheck";

const scheduleRoute: Router = Router();

// GET all schedules for date range with booking statistics (Admin, Librarian)
scheduleRoute.get("/", authCheck("admin", "librarian"), ScheduleController.getAdminSchedules);

// PATCH toggle open/closed state of an individual schedule slot (Admin, Librarian)
scheduleRoute.patch("/:id", authCheck("admin", "librarian"), ScheduleController.toggleScheduleSlot);

// POST bulk toggle schedules across dates / slot types (Admin only)
scheduleRoute.post("/bulk-toggle", authCheck("admin"), ScheduleController.bulkToggleSchedules);

// POST trigger rolling schedule generation for N days ahead (Admin only)
scheduleRoute.post("/generate", authCheck("admin"), ScheduleController.generateSchedules);

export default scheduleRoute;
