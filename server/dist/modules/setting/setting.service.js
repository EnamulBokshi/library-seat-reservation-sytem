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
        if (key === "MAX_BORROW_LIMIT") {
            return {
                id: "default-max-borrow",
                key: "MAX_BORROW_LIMIT",
                value: "3",
                description: "Maximum active books a student can borrow concurrently",
                updatedAt: new Date(),
            };
        }
        if (key === "BORROW_PERIOD_DAYS") {
            return {
                id: "default-borrow-period",
                key: "BORROW_PERIOD_DAYS",
                value: "10",
                description: "Default borrow period duration in days",
                updatedAt: new Date(),
            };
        }
        if (key === "MAX_RENEWAL_LIMIT") {
            return {
                id: "default-max-renewal",
                key: "MAX_RENEWAL_LIMIT",
                value: "3",
                description: "Maximum number of renewals allowed per book",
                updatedAt: new Date(),
            };
        }
        if (key === "FINE_RATE_PER_DAY") {
            return {
                id: "default-fine-rate",
                key: "FINE_RATE_PER_DAY",
                value: "5",
                description: "Overdue fine rate per day in BDT (Default: 5 Tk)",
                updatedAt: new Date(),
            };
        }
        if (key === "FINE_TIERS") {
            return {
                id: "default-fine-tiers",
                key: "FINE_TIERS",
                value: JSON.stringify([
                    { minDays: 1, rate: 5 },
                    { minDays: 8, rate: 10 },
                ]),
                description: "Configurable tiered fine rates by days overdue",
                updatedAt: new Date(),
            };
        }
        if (key === "WARNING_REMINDER_DAYS_BEFORE") {
            return {
                id: "default-warning-days",
                key: "WARNING_REMINDER_DAYS_BEFORE",
                value: "2",
                description: "Days before loan due date to dispatch warning email",
                updatedAt: new Date(),
            };
        }
    }
    return setting;
};
/**
 * Helper to get fine policy configuration
 */
const getFineConfig = async () => {
    const [rateSetting, tiersSetting, warningDaysSetting] = await Promise.all([
        getSettingByKey("FINE_RATE_PER_DAY"),
        getSettingByKey("FINE_TIERS"),
        getSettingByKey("WARNING_REMINDER_DAYS_BEFORE"),
    ]);
    const defaultRate = parseFloat(rateSetting?.value || "5") || 5;
    let tiers = [];
    try {
        if (tiersSetting?.value) {
            tiers = JSON.parse(tiersSetting.value);
        }
    }
    catch {
        tiers = [];
    }
    const warningDays = parseInt(warningDaysSetting?.value || "2", 10) || 2;
    return {
        defaultRate,
        tiers,
        warningDays,
    };
};
/**
 * Calculates accumulated loan fine dynamically based on overdue days and tiered policy.
 */
const calculateLoanFine = async (dueDate, returnDateOrNow = new Date()) => {
    const due = new Date(dueDate).getTime();
    const end = new Date(returnDateOrNow).getTime();
    if (end <= due) {
        return { daysOverdue: 0, fineAmount: 0 };
    }
    const diffMs = end - due;
    const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const config = await getFineConfig();
    if (config.tiers && config.tiers.length > 0) {
        const sortedTiers = [...config.tiers].sort((a, b) => b.minDays - a.minDays);
        let totalFine = 0;
        for (let day = 1; day <= daysOverdue; day++) {
            const matchingTier = sortedTiers.find((t) => day >= t.minDays);
            const rateForDay = matchingTier ? matchingTier.rate : config.defaultRate;
            totalFine += rateForDay;
        }
        return { daysOverdue, fineAmount: totalFine };
    }
    return { daysOverdue, fineAmount: daysOverdue * config.defaultRate };
};
/**
 * Helper to get borrow policy configuration
 */
const getBorrowConfig = async () => {
    const [maxBorrowSetting, periodSetting, renewalSetting] = await Promise.all([
        getSettingByKey("MAX_BORROW_LIMIT"),
        getSettingByKey("BORROW_PERIOD_DAYS"),
        getSettingByKey("MAX_RENEWAL_LIMIT"),
    ]);
    return {
        maxBorrowLimit: parseInt(maxBorrowSetting?.value || "3", 10) || 3,
        borrowPeriodDays: parseInt(periodSetting?.value || "10", 10) || 10,
        maxRenewalLimit: parseInt(renewalSetting?.value || "3", 10) || 3,
    };
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
    getBorrowConfig,
    getFineConfig,
    calculateLoanFine,
    updateSetting,
};
