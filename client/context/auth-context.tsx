"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { User, LoginPayload, RegisterPayload, AuthContextType } from "@/lib/types";
import { authService } from "@/services/auth-service";

// ─── Storage keys ─────────────────────────────────────────────────────────────

const LS_KEY = "library_seat_user";
const COOKIE_KEY = "library_user_session"; // non-HttpOnly, JS-readable fallback

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isClient() {
  return typeof window !== "undefined";
}

/** Read user from localStorage */
function readLS(): User | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/** Read user from a readable (non-HttpOnly) cookie — fallback when localStorage is empty */
function readCookie(): User | null {
  if (!isClient()) return null;
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`)
    );
    return match ? (JSON.parse(decodeURIComponent(match[1])) as User) : null;
  } catch {
    return null;
  }
}

/** Read from localStorage first, fall back to the readable cookie */
function readStoredUser(): User | null {
  return readLS() ?? readCookie();
}

/** Persist user to both localStorage AND a readable cookie (7-day expiry) */
function writeStoredUser(user: User) {
  if (!isClient()) return;
  try {
    const encoded = encodeURIComponent(JSON.stringify(user));
    localStorage.setItem(LS_KEY, JSON.stringify(user));
    document.cookie = `${COOKIE_KEY}=${encoded}; path=/; SameSite=Lax; Max-Age=604800`;
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

/** Clear user from both localStorage and the readable cookie */
function clearStoredUser() {
  if (!isClient()) return;
  localStorage.removeItem(LS_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /**
   * Initialise user synchronously from storage.
   * This avoids a "flash of unauthenticated UI" on hard refresh.
   */
  const [user, setUser] = useState<User | null>(readStoredUser);
  /**
   * isLoading is true only during the initial session check on mount.
   * It is NOT set during login/logout (those are handled by the form's own
   * submitting state), preventing unnecessary global loading flickers.
   */
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Prevent double-initialisation in React 18 StrictMode
  const initialised = useRef(false);

  // ── Session bootstrap ─────────────────────────────────────────────────────
  /**
   * Strategy: trust the stored user profile immediately (optimistic),
   * then validate the auth cookie by calling refresh in the background.
   *
   * Why not call refresh() eagerly to verify?
   * The refresh endpoint requires the *refreshToken* cookie. If only the
   * accessToken is present (e.g. after a hard refresh on a fresh device),
   * the refresh call would fail and we'd incorrectly log the user out even
   * though their access token is still valid.
   *
   * Instead we do lazy validation: the Axios interceptor already handles
   * 401 → refresh → retry on every real API call. So we only need to
   * proactively refresh here if we have a stored user whose token *may*
   * be expired, to avoid a silent 401 flash on first page load.
   */
  const initSession = useCallback(async () => {
    const stored = readStoredUser();

    if (!stored) {
      // No cached user at all → not authenticated
      setIsLoading(false);
      return;
    }

    // We already set user from storage in useState(readStoredUser).
    // Now do a background refresh to silently rotate the access token.
    // If it fails we leave the user in place — the first real API call
    // will hit a 401, the interceptor will try again, and if that fails
    // the component's error handler will prompt a re-login.
    try {
      await authService.refresh();
    } catch {
      // Refresh failed — the session may be expired.
      // Don't immediately log the user out here; the interceptor will handle
      // the next 401 so we're not over-aggressive.
      // Only clear if we get a hard 401 on the refresh itself.
      // (If the user truly lost their session, the next API call will fail
      //  with 401 and the interceptor won't be able to refresh → they'll see
      //  an error and can log in again.)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    initSession();
  }, [initSession]);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    const res = await authService.login(payload);
    // Server can return the authenticated entity under either `user` or `admin`
    const userData = res.data?.user ?? res.data?.admin;
    if (!userData) throw new Error("Unexpected response from server. Please try again.");
    setUser(userData);
    writeStoredUser(userData);
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
    // Clear local state immediately for instant UI feedback
    setUser(null);
    clearStoredUser();
    // Best-effort server call to clear the HttpOnly cookies
    try {
      await authService.logout();
    } catch {
      // Ignore — local state is already cleared
    }
  }, []);

  // ── refreshSession ────────────────────────────────────────────────────────
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await authService.refresh();
      return res.success;
    } catch {
      setUser(null);
      clearStoredUser();
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
