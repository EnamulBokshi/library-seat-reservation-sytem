import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { SettingService } from "./setting.service";

const getAllSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.getAllSettings();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Settings retrieved successfully",
    data: result,
  });
});

const getSettingByKey = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  const result = await SettingService.getSettingByKey(key as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Setting retrieved successfully",
    data: result,
  });
});

const updateSetting = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value, description } = req.body;
  const result = await SettingService.updateSetting(key as string, value, description);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Setting updated successfully",
    data: result,
  });
});

export const SettingController = {
  getAllSettings,
  getSettingByKey,
  updateSetting,
};
