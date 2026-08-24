import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ApiError } from "@/lib/types";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ message?: string }>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err: unknown) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/auth/refresh");
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status || 500;
    let message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    if (
      status >= 500 ||
      (typeof message === "string" &&
        (message.includes("invocation in") ||
          message.includes("PrismaClient") ||
          message.includes("Error:")))
    ) {
      message = "Something went wrong on the server. Please try again later.";
    }

    const customError: ApiError = {
      message,
      status,
      data: error.response?.data,
    };

    return Promise.reject(customError);
  }
);

export default apiClient;
