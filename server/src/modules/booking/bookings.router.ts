import { Router } from "express";
import { BookingController } from "./booking.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { BookingValidation } from "./booking.validation";

const bookingRoute: Router = Router();

// Create booking (Student only)
bookingRoute.post(
    "/",
    authCheck("student"),
    requestValidator(BookingValidation.createBookingSchema),
    BookingController.createBooking
);

// Get my bookings (Student only)
bookingRoute.get("/my", authCheck("student"), BookingController.getMyBookings);

// Get all bookings (Librarians & Admins)
bookingRoute.get("/", authCheck("admin", "librarian"), BookingController.getAllBookings);

// Get available schedules (all authenticated roles)
bookingRoute.get("/schedules", authCheck(), BookingController.getSchedules);

// Get real-time dashboard analytics (all authenticated roles)
bookingRoute.get("/stats", authCheck(), BookingController.getDashboardStats);

// Get booking details by ID (authenticated users)
bookingRoute.get("/:id", authCheck(), BookingController.getBookingById);

// Cancel booking (Student, Librarian, Admin)
bookingRoute.delete("/:id", authCheck("student", "admin", "librarian"), BookingController.cancelBooking);


export default bookingRoute;
