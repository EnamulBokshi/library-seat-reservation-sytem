import apiClient from "./api-client";
import {
  Booking,
  Schedule,
  CreateBookingPayload,
  CreateBookingResponseData,
  BookingQueryParams,
  DashboardStats,
  ApiResponse,
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
   * Get available schedule slots
   */
  async getSchedules(): Promise<ApiResponse<Schedule[]>> {
    return apiClient.get<unknown, ApiResponse<Schedule[]>>("/booking/schedules");
  },
};

export default bookingService;

