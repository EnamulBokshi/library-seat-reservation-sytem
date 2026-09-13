import { Router } from "express";
import { BookingController } from "./booking.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { BookingValidation } from "./booking.validation";

const bookingRoute: Router = Router();

// Create booking (Student, Admin, Librarian)
bookingRoute.post(
    "/",
    authCheck("student", "admin", "librarian"),
    requestValidator(BookingValidation.createBookingSchema),
    BookingController.createBooking
);

// Get my bookings (Student, Admin, Librarian)
bookingRoute.get("/my", authCheck("student", "admin", "librarian"), BookingController.getMyBookings);

// Get all bookings (Librarians & Admins)
bookingRoute.get("/", authCheck("admin", "librarian"), BookingController.getAllBookings);

// FCFS Quick Assign suggestion (Student, Admin, Librarian)
bookingRoute.get("/fcfs-suggest", authCheck("student", "admin", "librarian"), BookingController.getFCFSQuickAssign);

// Get available schedules (all authenticated roles)
bookingRoute.get("/schedules", authCheck(), BookingController.getSchedules);

// Get real-time dashboard analytics (all authenticated roles)
bookingRoute.get("/stats", authCheck(), BookingController.getDashboardStats);

// Student fine standing & reservation lock status — must precede "/:id"
bookingRoute.get(
    "/eligibility",
    authCheck("student", "admin", "librarian"),
    BookingController.getBookingEligibility
);

// Get booking details by ID (authenticated users)
bookingRoute.get("/:id", authCheck(), BookingController.getBookingById);

// Settle an outstanding seat fine at the circulation desk (Librarians & Admins)
bookingRoute.post(
    "/:id/pay-fine",
    authCheck("admin", "librarian"),
    requestValidator(BookingValidation.paySeatFineSchema),
    BookingController.paySeatFine
);

// Waive an outstanding seat fine (Librarians & Admins)
bookingRoute.post(
    "/:id/waive-fine",
    authCheck("admin", "librarian"),
    requestValidator(BookingValidation.waiveSeatFineSchema),
    BookingController.waiveSeatFine
);

// Cancel booking (Student, Librarian, Admin)
bookingRoute.delete("/:id", authCheck("student", "admin", "librarian"), BookingController.cancelBooking);


export default bookingRoute;
