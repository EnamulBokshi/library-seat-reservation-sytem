"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, LoginPayload, RegisterPayload, AuthContextType } from "@/lib/types";
import { authService } from "@/services/auth-service";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const initialised = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  // ── Session bootstrap ─────────────────────────────────────────────────────
  const initSession = useCallback(async () => {
    // Clean up any legacy localStorage/cookie entries from previous versions
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("library_seat_user");
        document.cookie = "library_user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch {
        // Ignore storage cleanup errors
      }
    }

    try {
      const res = await authService.getMe();
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 401 / unauthenticated / expired session
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    initSession();
  }, [initSession]);

  // Listen for unauthorized events dispatched by apiClient on failed refresh
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      if (
        typeof window !== "undefined" &&
        !pathname.startsWith("/auth/login") &&
        !pathname.startsWith("/auth/register")
      ) {
        const redirectUrl =
          pathname && pathname !== "/"
            ? `/auth/login?redirect=${encodeURIComponent(pathname)}`
            : "/auth/login";
        router.push(redirectUrl);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("auth:unauthorized", handleUnauthorized);
      return () => {
        window.removeEventListener("auth:unauthorized", handleUnauthorized);
      };
    }
  }, [pathname, router]);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    const res = await authService.login(payload);
    const userData = res.data?.user ?? res.data?.admin;
    if (!userData) throw new Error("Unexpected response from server. Please try again.");
    setUser(userData);
  }, []);

  // ── register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      const res = await authService.register(payload);
      if (!res.success) throw new Error(res.message ?? "Registration failed.");
      // Auto-login after successful registration
      await login({ email: payload.email, password: payload.password });
    },
    [login]
  );

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    setUser(null);
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    }
  }, []);

  // ── refreshSession ────────────────────────────────────────────────────────
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await authService.getMe();
      if (res.data?.user) {
        setUser(res.data.user);
        return true;
      }
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
