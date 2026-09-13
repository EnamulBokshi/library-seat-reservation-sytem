import apiClient from "./api-client"
import {
  Announcement,
  AnnouncementQueryParams,
  ApiResponse,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from "@/lib/types"

export const announcementService = {
  /** The reader's feed: live notices aimed at their role, pinned first. */
  async getMyAnnouncements(
    params?: AnnouncementQueryParams
  ): Promise<ApiResponse<Announcement[]>> {
    return apiClient.get<unknown, ApiResponse<Announcement[]>>(
      "/announcement/my",
      { params }
    )
  },

  /** Staff listing: every notice, retired and scheduled ones included. */
  async getAll(
    params?: AnnouncementQueryParams
  ): Promise<ApiResponse<Announcement[]>> {
    return apiClient.get<unknown, ApiResponse<Announcement[]>>(
      "/announcement",
      { params }
    )
  },

  async getById(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.get<unknown, ApiResponse<Announcement>>(
      `/announcement/${id}`
    )
  },

  async create(
    payload: CreateAnnouncementPayload
  ): Promise<ApiResponse<Announcement>> {
    return apiClient.post<unknown, ApiResponse<Announcement>>(
      "/announcement",
      payload
    )
  },

  async update(
    id: string,
    payload: UpdateAnnouncementPayload
  ): Promise<ApiResponse<Announcement>> {
    return apiClient.patch<unknown, ApiResponse<Announcement>>(
      `/announcement/${id}`,
      payload
    )
  },

  /** Retire a notice: readers lose it, staff keep the record. */
  async retire(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.delete<unknown, ApiResponse<Announcement>>(
      `/announcement/${id}`
    )
  },
}

export default announcementService
