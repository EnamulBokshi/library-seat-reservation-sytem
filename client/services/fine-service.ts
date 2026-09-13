import apiClient from "./api-client";
import {
  AdminFineRecord,
  ApiResponse,
  FineQueryParams,
  FineStats,
  PayFinePayload,
  WaiveFinePayload,
} from "@/lib/types";

export const fineService = {
  /**
   * Aggregate statistics for fines and collections
   */
  async getStats(): Promise<ApiResponse<FineStats>> {
    return apiClient.get<unknown, ApiResponse<FineStats>>("/fine/stats");
  },

  /**
   * Paginated, filtered, and sorted fine records across seat bookings and book loans
   */
  async getAll(params: FineQueryParams = {}): Promise<ApiResponse<AdminFineRecord[]>> {
    return apiClient.get<unknown, ApiResponse<AdminFineRecord[]>>("/fine", {
      params,
    });
  },

  /**
   * Settle an outstanding seat or book loan fine
   */
  async payFine(
    source: "seat" | "loan",
    id: string,
    payload: PayFinePayload
  ): Promise<ApiResponse<unknown>> {
    return apiClient.post<unknown, ApiResponse<unknown>>(`/fine/${source}/${id}/pay`, payload);
  },

  /**
   * Waive an outstanding seat or book loan fine with an audited justification
   */
  async waiveFine(
    source: "seat" | "loan",
    id: string,
    payload: WaiveFinePayload = {}
  ): Promise<ApiResponse<unknown>> {
    return apiClient.post<unknown, ApiResponse<unknown>>(`/fine/${source}/${id}/waive`, payload);
  },
};

export default fineService;
