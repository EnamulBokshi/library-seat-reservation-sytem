import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { ZoneService } from "./zone.service";

const createZone = catchAsync(async (req: Request, res: Response) => {
    const result = await ZoneService.createZone(req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Zone created successfully",
        data: result,
    });
});

const getAllZones = catchAsync(async (req: Request, res: Response) => {
    // Admins can request to see deactivated zones using showInactive=true query parameter
    const showInactive = req.user?.role === "admin" && req.query.showInactive === "true";
    const result = await ZoneService.getAllZones(showInactive);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Zones retrieved successfully",
        data: result,
    });
});

const getZoneById = catchAsync(async (req: Request, res: Response) => {
    const result = await ZoneService.getZoneById(req.params.id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Zone details retrieved successfully",
        data: result,
    });
});

const updateZone = catchAsync(async (req: Request, res: Response) => {
    const result = await ZoneService.updateZone(req.params.id as string, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Zone updated successfully",
        data: result,
    });
});

const deleteZone = catchAsync(async (req: Request, res: Response) => {
    const result = await ZoneService.deleteZone(req.params.id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Zone deactivated successfully",
        data: result,
    });
});

export const ZoneController = {
    createZone,
    getAllZones,
    getZoneById,
    updateZone,
    deleteZone,
};
