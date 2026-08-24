import apiClient from "./api-client";
import {
  Zone,
  Seat,
  CreateZonePayload,
  UpdateZonePayload,
  CreateSeatPayload,
  ApiResponse,
} from "@/lib/types";

export const zoneService = {
  /**
   * Create a new zone (admin only)
   */
  async create(payload: CreateZonePayload): Promise<ApiResponse<Zone>> {
    return apiClient.post<unknown, ApiResponse<Zone>>("/zone", payload);
  },

  /**
   * Get all zones (all authenticated roles)
   */
  async getAll(): Promise<ApiResponse<Zone[]>> {
    return apiClient.get<unknown, ApiResponse<Zone[]>>("/zone");
  },

  /**
   * Get zone by ID (all authenticated roles)
   */
  async getById(id: string): Promise<ApiResponse<Zone>> {
    return apiClient.get<unknown, ApiResponse<Zone>>(`/zone/${id}`);
  },

  /**
   * Update a zone (admin only)
   */
  async update(id: string, payload: UpdateZonePayload): Promise<ApiResponse<Zone>> {
    return apiClient.patch<unknown, ApiResponse<Zone>>(`/zone/${id}`, payload);
  },

  /**
   * Delete a zone (admin only)
   */
  async delete(id: string): Promise<ApiResponse<Zone>> {
    return apiClient.delete<unknown, ApiResponse<Zone>>(`/zone/${id}`);
  },

  /**
   * Create a seat within a zone (admin or librarian)
   */
  async createSeat(zoneId: string, payload: CreateSeatPayload): Promise<ApiResponse<Seat>> {
    return apiClient.post<unknown, ApiResponse<Seat>>(`/zone/${zoneId}/seats`, payload);
  },

  /**
   * Get all seats for a zone with optional schedule booking status (all authenticated roles)
   */
  async getSeatsByZone(
    zoneId: string,
    showInactive?: boolean,
    scheduleId?: string
  ): Promise<ApiResponse<Seat[]>> {
    const params: Record<string, string> = {};
    if (showInactive) params.showInactive = "true";
    if (scheduleId) params.scheduleId = scheduleId;
    return apiClient.get<unknown, ApiResponse<Seat[]>>(`/zone/${zoneId}/seats`, { params });
  },
};

export default zoneService;
