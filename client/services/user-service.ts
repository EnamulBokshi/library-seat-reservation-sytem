import apiClient from "./api-client";
import {
  ApiResponse,
  MyFinesResult,
  OtpChallenge,
  RequestEmailChangePayload,
  RequestPasswordChangePayload,
  UpdateProfilePayload,
  UserProfile,
  VerifyPasswordChangePayload,
} from "@/lib/types";

export const userService = {
  /**
   * Own profile record (richer than /auth/me — includes isActive).
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<unknown, ApiResponse<UserProfile>>("/user/me");
  },

  /**
   * Change display name. No verification step.
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<UserProfile>> {
    return apiClient.patch<unknown, ApiResponse<UserProfile>>("/user/me", payload);
  },

  /**
   * Seat fines and book-loan fines with the outstanding-dues summary.
   */
  async getMyFines(): Promise<ApiResponse<MyFinesResult>> {
    return apiClient.get<unknown, ApiResponse<MyFinesResult>>("/user/me/fines");
  },

  /**
   * Step 1 of an email change — mails a code to the NEW address.
   */
  async requestEmailChange(payload: RequestEmailChangePayload): Promise<ApiResponse<OtpChallenge>> {
    return apiClient.post<unknown, ApiResponse<OtpChallenge>>("/user/me/email/request-otp", payload);
  },

  /**
   * Step 2 of an email change — commits it once the code checks out.
   */
  async verifyEmailChange(code: string): Promise<ApiResponse<{ user: UserProfile; previousEmail: string }>> {
    return apiClient.post<unknown, ApiResponse<{ user: UserProfile; previousEmail: string }>>(
      "/user/me/email/verify",
      { code }
    );
  },

  /**
   * Step 1 of a password change — mails a code to the CURRENT address.
   */
  async requestPasswordChange(
    payload: RequestPasswordChangePayload
  ): Promise<ApiResponse<OtpChallenge>> {
    return apiClient.post<unknown, ApiResponse<OtpChallenge>>("/user/me/password/request-otp", payload);
  },

  /**
   * Step 2 of a password change — commits the new password.
   */
  async verifyPasswordChange(payload: VerifyPasswordChangePayload): Promise<ApiResponse<null>> {
    return apiClient.post<unknown, ApiResponse<null>>("/user/me/password/verify", payload);
  },
};

export default userService;
