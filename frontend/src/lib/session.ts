import type { StoredSession } from "@/lib/types";

const COOKIE_NAME = "tazelenme-session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 gün

// ─── Server-Side (cookies() from next/headers) ───

export async function getServerSession(): Promise<StoredSession | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;

  if (!raw) {
    return null;
  }

  try {
    // cookies().get() zaten cookie kütüphanesi aracılığıyla decode yapar
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function setServerSession(session: StoredSession) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  // cookies().set() dahili olarak encodeURIComponent uygular (cookie npm paketi)
  // Burada tekrar encode yapmıyoruz, yoksa çift encoding oluşur
  cookieStore.set(COOKIE_NAME, JSON.stringify(session), {
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
    httpOnly: false, // Client-side JS (apiRequest) cookie'yi okuyabilmeli
  });
}

export async function clearServerSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── Client-Side (document.cookie — replaces localStorage) ───

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  const target = cookies.find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));

  if (!target) {
    return null;
  }

  const value = target.split("=").slice(1).join("=").trim();

  try {
    return JSON.parse(decodeURIComponent(value)) as StoredSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function setStoredSession(session: StoredSession) {
  if (typeof window === "undefined") {
    return;
  }

  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
