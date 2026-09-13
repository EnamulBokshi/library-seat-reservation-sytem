import apiClient from "./api-client"
import {
  ApiResponse,
  CreateReportPayload,
  Report,
  ReportQueryParams,
  UpdateReportStatusPayload,
} from "@/lib/types"

export const reportService = {
  /** File a report about a bug, a service, the building or anything else. */
  async create(payload: CreateReportPayload): Promise<ApiResponse<Report>> {
    return apiClient.post<unknown, ApiResponse<Report>>("/report", payload)
  },

  /** The reporter's own reports. */
  async getMyReports(
    params?: ReportQueryParams
  ): Promise<ApiResponse<Report[]>> {
    return apiClient.get<unknown, ApiResponse<Report[]>>("/report/my", {
      params,
    })
  },

  /** Staff triage queue. */
  async getAll(params?: ReportQueryParams): Promise<ApiResponse<Report[]>> {
    return apiClient.get<unknown, ApiResponse<Report[]>>("/report", { params })
  },

  async getById(id: string): Promise<ApiResponse<Report>> {
    return apiClient.get<unknown, ApiResponse<Report>>(`/report/${id}`)
  },

  /** Staff: move a report along and reply to the reporter. */
  async updateStatus(
    id: string,
    payload: UpdateReportStatusPayload
  ): Promise<ApiResponse<Report>> {
    return apiClient.patch<unknown, ApiResponse<Report>>(
      `/report/${id}/status`,
      payload
    )
  },
}

export default reportService
