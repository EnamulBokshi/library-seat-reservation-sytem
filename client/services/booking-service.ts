import apiClient from "./api-client";
import {
  Booking,
  Schedule,
  CreateBookingPayload,
  CreateBookingResponseData,
  BookingQueryParams,
  DashboardStats,
  ApiResponse,
  BookingEligibility,
  PaySeatFinePayload,
  WaiveSeatFinePayload,
} from "@/lib/types";

export const bookingService = {
  /**
   * Create a new booking (student)
   */
  async create(payload: CreateBookingPayload): Promise<ApiResponse<CreateBookingResponseData>> {
    return apiClient.post<unknown, ApiResponse<CreateBookingResponseData>>("/booking", payload);
  },

  /**
   * Get real-time dashboard analytics & stats
   */
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return apiClient.get<unknown, ApiResponse<DashboardStats>>("/booking/stats");
  },

  /**
   * Get the currently-authenticated student's own bookings
   */
  async getMyBookings(): Promise<ApiResponse<Booking[]>> {
    return apiClient.get<unknown, ApiResponse<Booking[]>>("/booking/my");
  },

  /**
   * Get all bookings with optional filters (admin or librarian)
   */
  async getAll(params?: BookingQueryParams): Promise<ApiResponse<Booking[]>> {
    return apiClient.get<unknown, ApiResponse<Booking[]>>("/booking", { params });
  },

  /**
   * Get single booking by ID
   */
  async getById(id: string): Promise<ApiResponse<Booking>> {
    return apiClient.get<unknown, ApiResponse<Booking>>(`/booking/${id}`);
  },

  /**
   * Cancel a booking by ID (student, librarian, or admin)
   */
  async cancel(id: string): Promise<ApiResponse<Booking>> {
    return apiClient.delete<unknown, ApiResponse<Booking>>(`/booking/${id}`);
  },

  /**
   * Get First-Come-First-Serve quick suggestion (for 1 to N students)
   */
  async getFCFSSuggestion(
    zoneId: string,
    scheduleId: string,
    partySize: number = 1
  ): Promise<
    ApiResponse<{
      suggestedSeats: import("@/lib/types").Seat[];
      tableNumber?: string | null;
      tableType?: string;
      partySize: number;
      totalAvailableInZone: number;
    }>
  > {
    return apiClient.get("/booking/fcfs-suggest", {
      params: { zoneId, scheduleId, partySize },
    });
  },

  /**
   * Get the student's outstanding dues and whether reservations are locked
   */
  async getEligibility(): Promise<ApiResponse<BookingEligibility>> {
    return apiClient.get<unknown, ApiResponse<BookingEligibility>>("/booking/eligibility");
  },

  /**
   * Settle an outstanding seat fine at the circulation desk (admin or librarian)
   */
  async payFine(
    bookingId: string,
    payload: PaySeatFinePayload
  ): Promise<ApiResponse<Booking>> {
    return apiClient.post<unknown, ApiResponse<Booking>>(
      `/booking/${bookingId}/pay-fine`,
      payload
    );
  },

  /**
   * Waive an outstanding seat fine (admin or librarian)
   */
  async waiveFine(
    bookingId: string,
    payload: WaiveSeatFinePayload = {}
  ): Promise<ApiResponse<Booking>> {
    return apiClient.post<unknown, ApiResponse<Booking>>(
      `/booking/${bookingId}/waive-fine`,
      payload
    );
  },

  /**
   * Get available schedule slots
   */
  async getSchedules(): Promise<ApiResponse<Schedule[]>> {
    return apiClient.get<unknown, ApiResponse<Schedule[]>>("/booking/schedules");
  },
};

export default bookingService;

