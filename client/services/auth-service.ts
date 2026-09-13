import apiClient from "./api-client";
import {
  RegisterPayload,
  RegisterResult,
  LoginPayload,
  LoginResponseData,
  User,
  ApiResponse,
  VerifyEmailPayload,
  VerifyEmailResult,
} from "@/lib/types";

export const authService = {
  /**
   * Register a new student or faculty account. The account stays inert until
   * the emailed code is verified, and — for faculty — an admin approves it.
   */
  async register(payload: RegisterPayload): Promise<ApiResponse<RegisterResult>> {
    return apiClient.post<unknown, ApiResponse<RegisterResult>>("/auth/register", payload);
  },

  /**
   * Consume the 6-digit registration code. A student account is signed in by
   * the cookies this sets; a faculty account waits for admin approval.
   */
  async verifyEmail(payload: VerifyEmailPayload): Promise<ApiResponse<VerifyEmailResult>> {
    return apiClient.post<unknown, ApiResponse<VerifyEmailResult>>("/auth/verify-email", payload);
  },

  /**
   * Mail a fresh registration code to an unverified address.
   */
  async resendOtp(email: string): Promise<ApiResponse<{ sentTo: string; expiresInMinutes: number }>> {
    return apiClient.post<unknown, ApiResponse<{ sentTo: string; expiresInMinutes: number }>>(
      "/auth/resend-otp",
      { email }
    );
  },

  /**
   * Login user with email & password
   */
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponseData>> {
    return apiClient.post<unknown, ApiResponse<LoginResponseData>>("/auth/login", payload);
  },

  /**
   * Get current authenticated user profile
   */
  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get<unknown, ApiResponse<{ user: User }>>("/auth/me");
  },

  /**
   * Refresh access token using HttpOnly refresh token cookie
   */
  async refresh(): Promise<ApiResponse<{ user?: User } | null>> {
    return apiClient.post<unknown, ApiResponse<{ user?: User } | null>>("/auth/refresh");
  },

  /**
   * Logout user and clear cookies
   */
  async logout(): Promise<ApiResponse<null>> {
    return apiClient.post<unknown, ApiResponse<null>>("/auth/logout");
  },
};

export default authService;
