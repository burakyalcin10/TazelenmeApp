"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiRequest, ApiError, updateStoredUser } from "@/lib/api";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/lib/session";
import type { AdminUser, StoredSession, TokenBundle } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AdminUser | null;
  session: StoredSession | null;
  login: (tcNo: string, pin: string) => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe() {
  return apiRequest<AdminUser>("/api/v1/auth/me");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let ignore = false;

    const bootstrap = async () => {
      const stored = getStoredSession();

      if (!stored?.accessToken) {
        if (!ignore) {
          setStatus("unauthenticated");
          setSession(null);
          setUser(null);
        }
        return;
      }

      try {
        const me = await fetchMe();
        if (ignore) {
          return;
        }

        const nextSession = {
          ...stored,
          user: {
            ...stored.user,
            ...me,
          },
        };

        setStoredSession(nextSession);
        setSession(nextSession);
        setUser(nextSession.user);
        setStatus(nextSession.user.role === "ADMIN" ? "authenticated" : "unauthenticated");
      } catch {
        clearStoredSession();
        if (!ignore) {
          setStatus("unauthenticated");
          setSession(null);
          setUser(null);
        }
      }
    };

    bootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      session,
      async login(tcNo: string, pin: string) {
        const payload = await apiRequest<{
          user: AdminUser;
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        }>(
          "/api/v1/auth/login",
          {
            method: "POST",
            body: JSON.stringify({ tcNo, pin }),
          },
          { auth: false }
        );

        const tokenBundle: TokenBundle = {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          expiresIn: payload.expiresIn,
        };

        const baseSession: StoredSession = {
          ...tokenBundle,
          user: payload.user,
        };

        setStoredSession(baseSession);

        const me = await fetchMe();
        if (me.role !== "ADMIN") {
          clearStoredSession();
          throw new ApiError("Bu panel sadece yonetici kullanicilar icindir.", 403);
        }

        const nextSession = {
          ...baseSession,
          user: {
            ...payload.user,
            ...me,
          },
        };

        updateStoredUser(nextSession.user);
        startTransition(() => {
          setSession(nextSession);
          setUser(nextSession.user);
          setStatus("authenticated");
        });
      },
      async logout(silent = false) {
        try {
          if (!silent && getStoredSession()?.accessToken) {
            await apiRequest("/api/v1/auth/logout", { method: "POST" });
          }
        } catch {
          // Client state yine de temizlenecek.
        } finally {
          clearStoredSession();
          setSession(null);
          setUser(null);
          setStatus("unauthenticated");
        }
      },
      async refreshUser() {
        const me = await fetchMe();
        const current = getStoredSession();
        if (!current) {
          return;
        }

        const nextSession = {
          ...current,
          user: {
            ...current.user,
            ...me,
          },
        };

        setStoredSession(nextSession);
        setSession(nextSession);
        setUser(nextSession.user);
      },
    }),
    [session, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
