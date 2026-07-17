import { Router } from "express";
import { ZoneController } from "./zone.controller";
import { SeatController } from "../seat/seat.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { ZoneValidation } from "./zone.validation";
import { SeatValidation } from "../seat/seat.validation";

const zoneRoute: Router = Router();

// Zone CRUD Endpoints
zoneRoute.post(
    "/",
    authCheck("admin"),
    requestValidator(ZoneValidation.createZoneSchema),
    ZoneController.createZone
);

zoneRoute.get("/", authCheck(), ZoneController.getAllZones);
zoneRoute.get("/:id", authCheck(), ZoneController.getZoneById);

zoneRoute.patch(
    "/:id",
    authCheck("admin"),
    requestValidator(ZoneValidation.updateZoneSchema),
    ZoneController.updateZone
);

zoneRoute.delete("/:id", authCheck("admin"), ZoneController.deleteZone);

// Nested Seat Endpoints under Zone
zoneRoute.post(
    "/:id/seats",
    authCheck("admin", "librarian"),
    requestValidator(SeatValidation.createSeatSchema),
    SeatController.createSeat
);

zoneRoute.get("/:id/seats", authCheck(), SeatController.getSeatsByZone);

export default zoneRoute;
