import { getApiBaseUrl } from "@/lib/env";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/lib/session";
import type { AdminUser, StoredSession, TokenBundle } from "@/lib/types";

interface RequestConfig {
  auth?: boolean;
  retryOnAuthError?: boolean;
  headers?: HeadersInit;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

let refreshPromise: Promise<StoredSession | null> | null = null;

function mergeHeaders(configHeaders?: HeadersInit, initHeaders?: HeadersInit) {
  const headers = new Headers(configHeaders);
  const extraHeaders = new Headers(initHeaders);
  extraHeaders.forEach((value, key) => headers.set(key, value));
  return headers;
}

async function parseJsonSafe(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function refreshSession() {
  const currentSession = getStoredSession();

  if (!currentSession?.refreshToken) {
    clearStoredSession();
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
  });

  const payload = (await parseJsonSafe(response)) as
    | {
        success?: boolean;
        data?: TokenBundle;
      }
    | null;

  if (!response.ok || !payload?.data) {
    clearStoredSession();
    return null;
  }

  const nextSession: StoredSession = {
    ...payload.data,
    user: currentSession.user,
  };

  setStoredSession(nextSession);
  return nextSession;
}

async function getRefreshedSession() {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  config?: RequestConfig
): Promise<T> {
  const auth = config?.auth ?? true;
  const retryOnAuthError = config?.retryOnAuthError ?? true;
  const headers = mergeHeaders(config?.headers, init?.headers);

  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Client-side: proxy route token'ı server cookie'den okuyarak ekler.
  // Server-side: doğrudan backend çağrısı — token'ı cookie'den oku.
  if (auth && typeof window === "undefined") {
    // Server-side direct call — token'ı stored session'dan al
    const currentSession = getStoredSession();
    if (currentSession?.accessToken) {
      headers.set("Authorization", `Bearer ${currentSession.accessToken}`);
    }
  } else if (auth && typeof window !== "undefined") {
    // Client-side: cookie'den okunabildiyse ekle, okunamazsa proxy zaten ekleyecek
    const currentSession = getStoredSession();
    if (currentSession?.accessToken) {
      headers.set("Authorization", `Bearer ${currentSession.accessToken}`);
    }
    // Cookie okunamazsa da sorun yok — proxy server-side cookie'den ekler
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = (await parseJsonSafe(response)) as
    | {
        success?: boolean;
        data?: T;
        error?: string;
      }
    | null;

  if (response.status === 401 && auth && retryOnAuthError) {
    const refreshed = await getRefreshedSession();
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, init, { ...config, retryOnAuthError: false });
    }
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(payload?.error || "Beklenmeyen bir istek hatasi olustu.", response.status);
  }

  return (payload?.data ?? payload) as T;
}

export async function downloadAuthenticatedFile(path: string, fileName: string) {
  const session = getStoredSession();

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: session?.accessToken
      ? {
          Authorization: `Bearer ${session.accessToken}`,
        }
      : undefined,
  });

  if (response.status === 401) {
    const refreshed = await getRefreshedSession();
    if (refreshed?.accessToken) {
      return downloadAuthenticatedFile(path, fileName);
    }
  }

  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    throw new ApiError(
      (payload as { error?: string } | null)?.error || "Dosya indirilemedi.",
      response.status
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function updateStoredUser(partialUser: Partial<AdminUser>) {
  const current = getStoredSession();
  if (!current) {
    return;
  }

  setStoredSession({
    ...current,
    user: {
      ...current.user,
      ...partialUser,
    },
  });
}
