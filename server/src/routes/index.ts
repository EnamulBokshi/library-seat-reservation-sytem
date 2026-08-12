import { Router } from "express";
import authRoute from "../modules/auth/auth.router";
import studentRoute from "../modules/student/student.route";
import zoneRoute from "../modules/zone/zone.route";
import seatRoute from "../modules/seat/seat.route";
import bookingRoute from "../modules/booking/bookings.router";
import checkinRoute from "../modules/checkin/checkin.route";
import settingRoute from "../modules/setting/setting.route";

const indexRoutes: Router = Router();

indexRoutes.use("/auth", authRoute);
indexRoutes.use("/student", studentRoute);
indexRoutes.use("/zone", zoneRoute);
indexRoutes.use("/seat", seatRoute);
indexRoutes.use("/booking", bookingRoute);
indexRoutes.use("/checkin", checkinRoute);
indexRoutes.use("/setting", settingRoute);

export default indexRoutes;