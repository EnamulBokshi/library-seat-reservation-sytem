import apiClient from "./api-client"
import { ApiResponse, NavBadgeCounts } from "@/lib/types"

export const dashboardService = {
  /**
   * Counters for the navigation badges, scoped server-side to the caller's
   * role. `noticesSince` is the reader's own "last opened the notice page"
   * stamp, which turns the notice counter into an unseen count.
   */
  async getNavBadges(params?: {
    noticesSince?: string
  }): Promise<ApiResponse<NavBadgeCounts>> {
    return apiClient.get<unknown, ApiResponse<NavBadgeCounts>>(
      "/dashboard/badges",
      { params }
    )
  },
}

export default dashboardService
