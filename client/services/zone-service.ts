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
   * Create a table cluster with N chairs (admin or librarian)
   */
  async createTableCluster(
    zoneId: string,
    payload: { tableNumber: string; tableType: string; chairCount: number; prefix?: string }
  ): Promise<ApiResponse<{ tableNumber: string; seatsCreated: number; seats: Seat[] }>> {
    return apiClient.post(`/zone/${zoneId}/tables`, payload);
  },

  /**
   * Bulk generate multiple tables with chairs (admin or librarian)
   */
  async bulkCreateTables(
    zoneId: string,
    payload: {
      tableType: string;
      tableCount: number;
      chairsPerTable: number;
      tablePrefix?: string;
      startTableNumber?: number;
    }
  ): Promise<ApiResponse<{ tablesCreated: number; seatsCreated: number; skippedCount: number }>> {
    return apiClient.post(`/zone/${zoneId}/tables/bulk`, payload);
  },

  /**
   * Delete a table cluster (admin or librarian)
   */
  async deleteTable(
    zoneId: string,
    tableNumber: string
  ): Promise<ApiResponse<{ deletedCount: number; mode: string }>> {
    return apiClient.delete(`/zone/${zoneId}/tables/${encodeURIComponent(tableNumber)}`);
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
