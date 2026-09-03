"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const enums_1 = require("../../generated/enums");
/**
 * Create a new study zone.
 */
const createZone = async (payload) => {
    const existingZone = await prisma_1.default.zone.findUnique({
        where: { name: payload.name },
    });
    if (existingZone) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A zone with this name already exists");
    }
    const isGroupZone = payload.zoneType === enums_1.ZoneType.group_study || payload.zoneType === enums_1.ZoneType.conference_room;
    const zone = await prisma_1.default.zone.create({
        data: {
            name: payload.name,
            description: payload.description,
            color: payload.color || "#4F46E5",
            zoneType: payload.zoneType || enums_1.ZoneType.silent_desk,
            allowMultiSeat: payload.allowMultiSeat !== undefined ? payload.allowMultiSeat : isGroupZone,
            maxSeatsPerBooking: payload.maxSeatsPerBooking || (isGroupZone ? 8 : 1),
            defaultTableType: payload.defaultTableType || (isGroupZone ? enums_1.TableType.circle_table : enums_1.TableType.individual_cubicle),
            rules: payload.rules ?? [],
            isActive: payload.isActive !== undefined ? payload.isActive : true,
        },
    });
    return zone;
};
/**
 * List zones with active seat counts.
 */
const getAllZones = async (showInactive = false) => {
    const whereCondition = showInactive ? {} : { isActive: true };
    const zones = await prisma_1.default.zone.findMany({
        where: whereCondition,
        include: {
            seats: {
                where: { isActive: true },
                select: { id: true, tableNumber: true },
            },
        },
        orderBy: { name: "asc" },
    });
    return zones.map((zone) => {
        const { seats, ...zoneData } = zone;
        const distinctTables = new Set(seats.map(s => s.tableNumber).filter(Boolean));
        return {
            ...zoneData,
            seatCount: seats.length,
            tableCount: distinctTables.size,
        };
    });
};
/**
 * Get details of a single zone.
 */
const getZoneById = async (id) => {
    const zone = await prisma_1.default.zone.findUnique({
        where: { id },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    return zone;
};
/**
 * Update zone details.
 */
const updateZone = async (id, payload) => {
    const zone = await prisma_1.default.zone.findUnique({
        where: { id },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    if (payload.name && payload.name !== zone.name) {
        const existingZone = await prisma_1.default.zone.findUnique({
            where: { name: payload.name },
        });
        if (existingZone) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "A zone with this name already exists");
        }
    }
    const updatedZone = await prisma_1.default.zone.update({
        where: { id },
        data: payload,
    });
    return updatedZone;
};
/**
 * Soft-delete a zone (set isActive = false).
 */
const deleteZone = async (id) => {
    const zone = await prisma_1.default.zone.findUnique({
        where: { id },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    const deletedZone = await prisma_1.default.zone.update({
        where: { id },
        data: { isActive: false },
    });
    return deletedZone;
};
exports.ZoneService = {
    createZone,
    getAllZones,
    getZoneById,
    updateZone,
    deleteZone,
};
