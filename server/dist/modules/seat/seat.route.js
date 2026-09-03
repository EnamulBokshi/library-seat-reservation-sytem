"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const seat_controller_1 = require("./seat.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const requestValidator_1 = __importDefault(require("../../middleware/requestValidator"));
const seat_validation_1 = require("./seat.validation");
const seatRoute = (0, express_1.Router)();
// Standalone Seat Management Endpoints
seatRoute.patch("/:id", (0, authCheck_1.default)("admin", "librarian"), (0, requestValidator_1.default)(seat_validation_1.SeatValidation.updateSeatSchema), seat_controller_1.SeatController.updateSeat);
seatRoute.delete("/:id", (0, authCheck_1.default)("admin", "librarian"), seat_controller_1.SeatController.deleteSeat);
exports.default = seatRoute;
