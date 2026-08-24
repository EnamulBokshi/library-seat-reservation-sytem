import apiClient from "./api-client";
import {
  Schedule,
  BulkToggleSchedulePayload,
  BulkToggleScheduleResponse,
  ApiResponse,
} from "@/lib/types";

export const scheduleService = {
  /**
   * Get all schedules for the specified date range (admin / librarian)
   */
  async getAdminSchedules(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Schedule[]>> {
    return apiClient.get<unknown, ApiResponse<Schedule[]>>("/schedule", { params });
  },

  /**
   * Toggle the open / closed state of an individual schedule slot
   */
  async toggle(id: string, isOpen: boolean): Promise<ApiResponse<Schedule>> {
    return apiClient.patch<unknown, ApiResponse<Schedule>>(`/schedule/${id}`, { isOpen });
  },

  /**
   * Bulk open or close schedule slots across multiple dates or ranges
   */
  async bulkToggle(
    payload: BulkToggleSchedulePayload
  ): Promise<ApiResponse<BulkToggleScheduleResponse>> {
    return apiClient.post<unknown, ApiResponse<BulkToggleScheduleResponse>>(
      "/schedule/bulk-toggle",
      payload
    );
  },

  /**
   * Manually trigger schedule generation for upcoming days
   */
  async generate(daysAhead: number = 14): Promise<ApiResponse<{ message: string; daysAhead: number }>> {
    return apiClient.post<unknown, ApiResponse<{ message: string; daysAhead: number }>>(
      "/schedule/generate",
      { daysAhead }
    );
  },
};

export default scheduleService;
