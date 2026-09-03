import apiClient from "./api-client";
import { CheckInPayload, CheckInResponseData, ApiResponse } from "@/lib/types";

export const checkinService = {
  /**
   * Scan a QR token — toggles check-in or check-out based on booking state.
   * (admin or librarian)
   */
  async scan(payload: CheckInPayload): Promise<ApiResponse<CheckInResponseData>> {
    return apiClient.post<unknown, ApiResponse<CheckInResponseData>>("/checkin", payload);
  },
};

export default checkinService;
