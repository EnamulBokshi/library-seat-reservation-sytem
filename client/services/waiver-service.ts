import apiClient from "./api-client";
import {
  ApiResponse,
  CreateWaiverRequestPayload,
  DecideWaiverRequestPayload,
  FineWaiverRequest,
  StudentFineLookup,
} from "@/lib/types";

export const waiverService = {
  /** Faculty: petition an admin to clear one student fine. */
  async createRequest(payload: CreateWaiverRequestPayload): Promise<ApiResponse<FineWaiverRequest>> {
    return apiClient.post<unknown, ApiResponse<FineWaiverRequest>>("/waiver", payload);
  },

  /** Faculty: find a student's outstanding, petitionable fines. */
  async lookupStudentFines(identifier: string): Promise<ApiResponse<StudentFineLookup>> {
    return apiClient.get<unknown, ApiResponse<StudentFineLookup>>("/waiver/lookup", {
      params: { identifier },
    });
  },

  /** Faculty: petitions this account raised. */
  async getMyRequests(): Promise<ApiResponse<FineWaiverRequest[]>> {
    return apiClient.get<unknown, ApiResponse<FineWaiverRequest[]>>("/waiver/my");
  },

  /** Admin / librarian: the review queue. */
  async getAllRequests(params?: { status?: string; page?: number; limit?: number }): Promise<
    ApiResponse<FineWaiverRequest[]>
  > {
    return apiClient.get<unknown, ApiResponse<FineWaiverRequest[]>>("/waiver", { params });
  },

  /** Admin: approve or reject one petition. */
  async decideRequest(
    id: string,
    payload: DecideWaiverRequestPayload
  ): Promise<ApiResponse<FineWaiverRequest>> {
    return apiClient.patch<unknown, ApiResponse<FineWaiverRequest>>(`/waiver/${id}/decide`, payload);
  },
};

export default waiverService;
