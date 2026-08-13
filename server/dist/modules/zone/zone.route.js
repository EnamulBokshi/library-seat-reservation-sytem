"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zone_controller_1 = require("./zone.controller");
const seat_controller_1 = require("../seat/seat.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const zone_validation_1 = require("./zone.validation");
const seat_validation_1 = require("../seat/seat.validation");
const zoneRoute = (0, express_1.Router)();
// Zone CRUD Endpoints
zoneRoute.post("/", (0, authCheck_1.default)("admin"), (0, requestValidator_1.default)(zone_validation_1.ZoneValidation.createZoneSchema), zone_controller_1.ZoneController.createZone);
zoneRoute.get("/", zone_controller_1.ZoneController.getAllZones);
zoneRoute.get("/:id", zone_controller_1.ZoneController.getZoneById);
zoneRoute.patch("/:id", (0, authCheck_1.default)("admin"), (0, requestValidator_1.default)(zone_validation_1.ZoneValidation.updateZoneSchema), zone_controller_1.ZoneController.updateZone);
zoneRoute.delete("/:id", (0, authCheck_1.default)("admin"), zone_controller_1.ZoneController.deleteZone);
// Nested Seat Endpoints under Zone
zoneRoute.post("/:id/seats", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(seat_validation_1.SeatValidation.createSeatSchema), seat_controller_1.SeatController.createSeat);
zoneRoute.get("/:id/seats", seat_controller_1.SeatController.getSeatsByZone);
exports.default = zoneRoute;
