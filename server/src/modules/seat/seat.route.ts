import { Router } from "express";
import { SeatController } from "./seat.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { SeatValidation } from "./seat.validation";

const seatRoute: Router = Router();

// Standalone Seat Management Endpoints
seatRoute.patch(
    "/:id",
    authCheck("admin", "librarian"),
    requestValidator(SeatValidation.updateSeatSchema),
    SeatController.updateSeat
);

seatRoute.delete("/:id", authCheck("admin", "librarian"), SeatController.deleteSeat);

export default seatRoute;
