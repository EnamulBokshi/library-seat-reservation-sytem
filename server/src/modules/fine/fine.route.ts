import { Router } from "express";
import { FineController } from "./fine.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { FineValidation } from "./fine.validation";

const fineRoute: Router = Router();

// All fine management endpoints require admin or librarian role
fineRoute.use(authCheck("admin", "librarian"));

fineRoute.get("/stats", FineController.getStats);
fineRoute.get("/", FineController.getAllFines);

fineRoute.post(
  "/:source/:id/pay",
  requestValidator(FineValidation.payFineSchema),
  FineController.payFine
);

fineRoute.post(
  "/:source/:id/waive",
  requestValidator(FineValidation.waiveFineSchema),
  FineController.waiveFine
);

export default fineRoute;
