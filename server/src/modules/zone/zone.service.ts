import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { ICreateZonePayload, IUpdateZonePayload } from "./zone.interface";

/**
 * Create a new study zone.
 */
const createZone = async (payload: ICreateZonePayload) => {
    const existingZone = await prisma.zone.findUnique({
        where: { name: payload.name },
    });

    if (existingZone) {
        throw new AppError(status.CONFLICT, "A zone with this name already exists");
    }

    const zone = await prisma.zone.create({
        data: {
            name: payload.name,
            description: payload.description,
            color: payload.color || "#4F46E5",
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

    const zones = await prisma.zone.findMany({
        where: whereCondition,
        include: {
            seats: {
                where: { isActive: true },
                select: { id: true },
            },
        },
    });

    return zones.map((zone) => {
        const { seats, ...zoneData } = zone;
        return {
            ...zoneData,
            seatCount: seats.length,
        };
    });
};

/**
 * Get details of a single zone.
 */
const getZoneById = async (id: string) => {
    const zone = await prisma.zone.findUnique({
        where: { id },
    });

    if (!zone) {
        throw new AppError(status.NOT_FOUND, "Zone not found");
    }

    return zone;
};

/**
 * Update zone details.
 */
const updateZone = async (id: string, payload: IUpdateZonePayload) => {
    const zone = await prisma.zone.findUnique({
        where: { id },
    });

    if (!zone) {
        throw new AppError(status.NOT_FOUND, "Zone not found");
    }

    if (payload.name && payload.name !== zone.name) {
        const existingZone = await prisma.zone.findUnique({
            where: { name: payload.name },
        });
        if (existingZone) {
            throw new AppError(status.CONFLICT, "A zone with this name already exists");
        }
    }

    const updatedZone = await prisma.zone.update({
        where: { id },
        data: payload,
    });

    return updatedZone;
};

/**
 * Soft-delete a zone (set isActive = false).
 */
const deleteZone = async (id: string) => {
    const zone = await prisma.zone.findUnique({
        where: { id },
    });

    if (!zone) {
        throw new AppError(status.NOT_FOUND, "Zone not found");
    }

    const deletedZone = await prisma.zone.update({
        where: { id },
        data: { isActive: false },
    });

    return deletedZone;
};

export const ZoneService = {
    createZone,
    getAllZones,
    getZoneById,
    updateZone,
    deleteZone,
};
