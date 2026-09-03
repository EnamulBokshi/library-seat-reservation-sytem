import { Router } from "express";
import { CheckInController } from "./checkin.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { CheckInValidation } from "./checkin.validation";

const checkinRoute: Router = Router();

// Entry/Exit Scan (Librarians and Admins only)
checkinRoute.post(
    "/",
    authCheck("admin", "librarian"),
    requestValidator(CheckInValidation.scanQRSchema),
    CheckInController.scanQR
);

export default checkinRoute;
