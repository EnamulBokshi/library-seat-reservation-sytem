import apiClient from "./api-client";
import { Seat, UpdateSeatPayload, ApiResponse } from "@/lib/types";

export const seatService = {
  /**
   * Update a seat (admin or librarian)
   */
  async update(id: string, payload: UpdateSeatPayload): Promise<ApiResponse<Seat>> {
    return apiClient.patch<unknown, ApiResponse<Seat>>(`/seat/${id}`, payload);
  },

  /**
   * Hard-delete a seat (admin or librarian)
   */
  async delete(id: string): Promise<ApiResponse<Seat>> {
    return apiClient.delete<unknown, ApiResponse<Seat>>(`/seat/${id}`);
  },
};

export default seatService;
