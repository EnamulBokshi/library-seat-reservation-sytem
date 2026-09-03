"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const zone_service_1 = require("./zone.service");
const createZone = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await zone_service_1.ZoneService.createZone(req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.CREATED,
        success: true,
        message: "Zone created successfully",
        data: result,
    });
});
const getAllZones = (0, CatchAsync_1.default)(async (req, res) => {
    // Admins can request to see deactivated zones using showInactive=true query parameter
    const showInactive = req.user?.role === "admin" && req.query.showInactive === "true";
    const result = await zone_service_1.ZoneService.getAllZones(showInactive);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Zones retrieved successfully",
        data: result,
    });
});
const getZoneById = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await zone_service_1.ZoneService.getZoneById(req.params.id);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Zone details retrieved successfully",
        data: result,
    });
});
const updateZone = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await zone_service_1.ZoneService.updateZone(req.params.id, req.body);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Zone updated successfully",
        data: result,
    });
});
const deleteZone = (0, CatchAsync_1.default)(async (req, res) => {
    const result = await zone_service_1.ZoneService.deleteZone(req.params.id);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Zone deactivated successfully",
        data: result,
    });
});
exports.ZoneController = {
    createZone,
    getAllZones,
    getZoneById,
    updateZone,
    deleteZone,
};
