import { Router } from "express";
import authRoute from "../modules/auth/auth.router";
import studentRoute from "../modules/student/student.route";
import zoneRoute from "../modules/zone/zone.route";
import seatRoute from "../modules/seat/seat.route";
import bookingRoute from "../modules/booking/bookings.router";
import checkinRoute from "../modules/checkin/checkin.route";
import settingRoute from "../modules/setting/setting.route";
import scheduleRoute from "../modules/schedule/schedule.router";
import bookRoute from "../modules/book/book.route";
import loanRoute from "../modules/loan/loan.route";
import userRoute from "../modules/user/user.route";
import fineRoute from "../modules/fine/fine.route";
import waiverRoute from "../modules/waiver/waiver.route";

const indexRoutes: Router = Router();

indexRoutes.use("/auth", authRoute);
indexRoutes.use("/student", studentRoute);
indexRoutes.use("/zone", zoneRoute);
indexRoutes.use("/seat", seatRoute);
indexRoutes.use("/booking", bookingRoute);
indexRoutes.use("/checkin", checkinRoute);
indexRoutes.use("/setting", settingRoute);
indexRoutes.use("/schedule", scheduleRoute);
indexRoutes.use("/book", bookRoute);
indexRoutes.use("/loan", loanRoute);
indexRoutes.use("/user", userRoute);
indexRoutes.use("/fine", fineRoute);
indexRoutes.use("/waiver", waiverRoute);

export default indexRoutes;