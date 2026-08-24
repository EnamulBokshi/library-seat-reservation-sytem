import apiClient from "./api-client";
import {
  RegisterPayload,
  LoginPayload,
  LoginResponseData,
  User,
  ApiResponse,
} from "@/lib/types";

export const authService = {
  /**
   * Register a new student user account
   */
  async register(payload: RegisterPayload): Promise<ApiResponse<User>> {
    return apiClient.post<unknown, ApiResponse<User>>("/auth/register", payload);
  },

  /**
   * Login user with email & password
   */
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponseData>> {
    return apiClient.post<unknown, ApiResponse<LoginResponseData>>("/auth/login", payload);
  },

  /**
   * Refresh access token using HttpOnly refresh token cookie
   */
  async refresh(): Promise<ApiResponse<null>> {
    return apiClient.post<unknown, ApiResponse<null>>("/auth/refresh");
  },

  /**
   * Logout user and clear cookies
   */
  async logout(): Promise<ApiResponse<null>> {
    return apiClient.post<unknown, ApiResponse<null>>("/auth/logout");
  },
};

export default authService;
