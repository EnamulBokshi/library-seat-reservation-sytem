import apiClient from "./api-client";
import { ApiResponse } from "@/lib/types";

export interface SettingItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export const settingService = {
  /**
   * Get all system settings (Admin / Librarian)
   */
  async getAll(): Promise<ApiResponse<SettingItem[]>> {
    return apiClient.get<unknown, ApiResponse<SettingItem[]>>("/setting");
  },

  /**
   * Update a setting by key (Admin only)
   */
  async update(key: string, value: string, description?: string): Promise<ApiResponse<SettingItem>> {
    return apiClient.patch<unknown, ApiResponse<SettingItem>>(`/setting/${key}`, { value, description });
  },
};

export default settingService;
