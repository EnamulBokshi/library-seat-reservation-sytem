import prisma from "../../lib/prisma";

/**
 * Get all settings.
 */
const getAllSettings = async () => {
  return prisma.setting.findMany({
    orderBy: { key: "asc" },
  });
};

/**
 * Get a setting by key.
 */
const getSettingByKey = async (key: string) => {
  return prisma.setting.findUnique({
    where: { key },
  });
};

/**
 * Upsert/Update a setting by key (admin only).
 */
const updateSetting = async (key: string, value: string, description?: string) => {
  return prisma.setting.upsert({
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

export const SettingService = {
  getAllSettings,
  getSettingByKey,
  updateSetting,
};
