"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingService = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
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
    return prisma_1.default.setting.findUnique({
        where: { key },
    });
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
    updateSetting,
};
