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

// Cancel booking (Student, Librarian, Admin)
bookingRoute.delete("/:id", authCheck("student", "admin", "librarian"), BookingController.cancelBooking);

export default bookingRoute;
