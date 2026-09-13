import apiClient from "./api-client"
import { ApiResponse, NavBadgeCounts } from "@/lib/types"

export const dashboardService = {
  /** Counters for the sidebar badges, scoped server-side to the caller's role. */
  async getNavBadges(): Promise<ApiResponse<NavBadgeCounts>> {
    return apiClient.get<unknown, ApiResponse<NavBadgeCounts>>(
      "/dashboard/badges"
    )
  },
}

export default dashboardService
