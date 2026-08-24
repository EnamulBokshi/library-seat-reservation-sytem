"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingService = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const time_1 = require("../../utils/time");
/**
 * Get all settings.
 */
const getAllSettings = async () => {
    return prisma_1.default.setting.findMany({
        orderBy: { key: "asc" },
    });
};
/**
 * Get a setting by key.
 */
const getSettingByKey = async (key) => {
    const setting = await prisma_1.default.setting.findUnique({
        where: { key },
    });
    if (!setting) {
        if (key === "SLOT_CONFIG") {
            return {
                id: "default-slot-config",
                key: "SLOT_CONFIG",
                value: JSON.stringify(time_1.DEFAULT_SLOT_CONFIG),
                description: "Library time slot configuration and timings",
                updatedAt: new Date(),
            };
        }
        if (key === "ADVANCE_BOOKING_DAYS") {
            return {
                id: "default-advance-days",
                key: "ADVANCE_BOOKING_DAYS",
                value: "7",
                description: "Number of days in advance reservations can be made",
                updatedAt: new Date(),
            };
        }
    }
    return setting;
};
/**
 * Get public system configuration (slot timings and advance days).
 */
const getPublicConfig = async () => {
    const slotConfig = await (0, time_1.getActiveSlotConfig)();
    const advanceBookingDays = await (0, time_1.getAdvanceBookingDays)();
    return {
        slotConfig,
        advanceBookingDays,
    };
};
/**
 * Upsert/Update a setting by key (admin only).
 */
const updateSetting = async (key, value, description) => {
    return prisma_1.default.setting.upsert({
        where: { key },
        update: {
            value,
            description: description ?? undefined,
        },
        create: {
            key,
            value,
            description: description ?? "System configuration setting",
        },
    });
};
exports.SettingService = {
    getAllSettings,
    getSettingByKey,
    getPublicConfig,
    updateSetting,
};
