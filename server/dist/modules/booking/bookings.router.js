"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("./booking.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const booking_validation_1 = require("./booking.validation");
const bookingRoute = (0, express_1.Router)();
// Create booking (Student, Admin, Librarian)
bookingRoute.post("/", (0, authCheck_1.default)("student", "admin", "librarian"), (0, requestValidator_1.default)(booking_validation_1.BookingValidation.createBookingSchema), booking_controller_1.BookingController.createBooking);
// Get my bookings (Student, Admin, Librarian)
bookingRoute.get("/my", (0, authCheck_1.default)("student", "admin", "librarian"), booking_controller_1.BookingController.getMyBookings);
// Get all bookings (Librarians & Admins)
bookingRoute.get("/", (0, authCheck_1.default)("admin", "librarian"), booking_controller_1.BookingController.getAllBookings);
// FCFS Quick Assign suggestion (Student, Admin, Librarian)
bookingRoute.get("/fcfs-suggest", (0, authCheck_1.default)("student", "admin", "librarian"), booking_controller_1.BookingController.getFCFSQuickAssign);
// Get available schedules (all authenticated roles)
bookingRoute.get("/schedules", (0, authCheck_1.default)(), booking_controller_1.BookingController.getSchedules);
// Get real-time dashboard analytics (all authenticated roles)
bookingRoute.get("/stats", (0, authCheck_1.default)(), booking_controller_1.BookingController.getDashboardStats);
// Student fine standing & reservation lock status — must precede "/:id"
bookingRoute.get("/eligibility", (0, authCheck_1.default)("student", "admin", "librarian"), booking_controller_1.BookingController.getBookingEligibility);
// Get booking details by ID (authenticated users)
bookingRoute.get("/:id", (0, authCheck_1.default)(), booking_controller_1.BookingController.getBookingById);
// Settle an outstanding seat fine at the circulation desk (Librarians & Admins)
bookingRoute.post("/:id/pay-fine", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(booking_validation_1.BookingValidation.paySeatFineSchema), booking_controller_1.BookingController.paySeatFine);
// Waive an outstanding seat fine (Librarians & Admins)
bookingRoute.post("/:id/waive-fine", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(booking_validation_1.BookingValidation.waiveSeatFineSchema), booking_controller_1.BookingController.waiveSeatFine);
// Cancel booking (Student, Librarian, Admin)
bookingRoute.delete("/:id", (0, authCheck_1.default)("student", "admin", "librarian"), booking_controller_1.BookingController.cancelBooking);
exports.default = bookingRoute;
