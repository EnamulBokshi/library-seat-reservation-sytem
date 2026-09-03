import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { ScheduleService } from "./schedule.service";

const getAdminSchedules = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const result = await ScheduleService.getAdminSchedules(
    startDate ? String(startDate) : undefined,
    endDate ? String(endDate) : undefined
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin schedules retrieved successfully",
    data: result,
  });
});

const toggleScheduleSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isOpen } = req.body;
  const result = await ScheduleService.toggleScheduleSlot(id as string, Boolean(isOpen));
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Schedule slot ${isOpen ? "opened" : "closed"} successfully`,
    data: result,
  });
});

const bulkToggleSchedules = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleService.bulkToggleSchedules(req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const generateSchedules = catchAsync(async (req: Request, res: Response) => {
  const { daysAhead } = req.body;
  const result = await ScheduleService.generateSchedules(
    daysAhead ? parseInt(daysAhead, 10) : 14
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const ScheduleController = {
  getAdminSchedules,
  toggleScheduleSlot,
  bulkToggleSchedules,
  generateSchedules,
};
