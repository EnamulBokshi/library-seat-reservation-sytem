"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSlotExpired = exports.isSlotActive = exports.getAdvanceBookingDays = exports.getActiveSlotConfig = exports.parseTimeToMinutes = exports.DEFAULT_SLOT_CONFIG = void 0;
const enums_1 = require("../generated/enums");
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.DEFAULT_SLOT_CONFIG = {
    [enums_1.SlotType.morning]: {
        startTime: "08:00",
        endTime: "12:00",
        label: "Morning",
        icon: "🌅",
        enabled: true,
    },
    [enums_1.SlotType.noon]: {
        startTime: "12:00",
        endTime: "14:00",
        label: "Noon",
        icon: "☀️",
        enabled: true,
    },
    [enums_1.SlotType.afternoon]: {
        startTime: "14:00",
        endTime: "18:00",
        label: "Afternoon",
        icon: "🌇",
        enabled: true,
    },
    [enums_1.SlotType.evening]: {
        startTime: "18:00",
        endTime: "21:00",
        label: "Evening",
        icon: "🌙",
        enabled: true,
    },
};
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr)
        return 0;
    const [hourStr, minuteStr] = timeStr.split(":");
    const hours = parseInt(hourStr, 10) || 0;
    const minutes = parseInt(minuteStr, 10) || 0;
    return hours * 60 + minutes;
};
exports.parseTimeToMinutes = parseTimeToMinutes;
/**
 * Retrieve the active Slot Configuration from database or return default.
 */
const getActiveSlotConfig = async () => {
    try {
        const setting = await prisma_1.default.setting.findUnique({
            where: { key: "SLOT_CONFIG" },
        });
        if (setting?.value) {
            const parsed = JSON.parse(setting.value);
            return {
                ...exports.DEFAULT_SLOT_CONFIG,
                ...parsed,
            };
        }
    }
    catch {
        // fallback to default
    }
    return exports.DEFAULT_SLOT_CONFIG;
};
exports.getActiveSlotConfig = getActiveSlotConfig;
/**
 * Retrieve advance booking window in days.
 */
const getAdvanceBookingDays = async () => {
    try {
        const setting = await prisma_1.default.setting.findUnique({
            where: { key: "ADVANCE_BOOKING_DAYS" },
        });
        if (setting?.value) {
            const val = parseInt(setting.value, 10);
            if (!isNaN(val) && val > 0)
                return val;
        }
    }
    catch {
        // fallback to default
    }
    return 7;
};
exports.getAdvanceBookingDays = getAdvanceBookingDays;
/**
 * Checks if the current local time falls within the given date and slot type window.
 */
const isSlotActive = (scheduleDate, slot, customConfig) => {
    const now = new Date();
    const sDate = new Date(scheduleDate);
    // Verify date matches (Year, Month, Date)
    if (now.getFullYear() !== sDate.getFullYear() ||
        now.getMonth() !== sDate.getMonth() ||
        now.getDate() !== sDate.getDate()) {
        return false;
    }
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;
    const config = customConfig ?? exports.DEFAULT_SLOT_CONFIG;
    const slotInfo = config[slot] ?? exports.DEFAULT_SLOT_CONFIG[slot];
    if (!slotInfo || !slotInfo.enabled) {
        return false;
    }
    const startMinutes = (0, exports.parseTimeToMinutes)(slotInfo.startTime);
    const endMinutes = (0, exports.parseTimeToMinutes)(slotInfo.endTime);
    return totalMinutes >= startMinutes && totalMinutes < endMinutes;
};
exports.isSlotActive = isSlotActive;
/**
 * Checks if the slot has already ended for the given schedule date.
 * If date is in the past, returns true.
 * If date is in the future, returns false.
 * If date is today, returns true if current time >= slot end time.
 */
const isSlotExpired = (scheduleDate, slot, customConfig) => {
    const now = new Date();
    const sDate = new Date(scheduleDate);
    const todayStr = now.toISOString().split("T")[0];
    const sDateStr = sDate.toISOString().split("T")[0];
    if (sDateStr < todayStr) {
        return true;
    }
    if (sDateStr > todayStr) {
        return false;
    }
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;
    const config = customConfig ?? exports.DEFAULT_SLOT_CONFIG;
    const slotInfo = config[slot] ?? exports.DEFAULT_SLOT_CONFIG[slot];
    if (!slotInfo) {
        return false;
    }
    const endMinutes = (0, exports.parseTimeToMinutes)(slotInfo.endTime);
    return currentMinutes >= endMinutes;
};
exports.isSlotExpired = isSlotExpired;
