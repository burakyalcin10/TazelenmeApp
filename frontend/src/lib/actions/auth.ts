"use server";

import { redirect } from "next/navigation";

import { getApiBaseUrl } from "@/lib/env";
import { clearServerSession, setServerSession } from "@/lib/session";
import type { AdminUser, StoredSession, TokenBundle } from "@/lib/types";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const tcNo = formData.get("tcNo") as string;
  const pin = formData.get("pin") as string;

  if (!tcNo || tcNo.length !== 11) {
    return { error: "TC kimlik numarası 11 haneli olmalıdır." };
  }

  if (!pin || pin.length !== 4) {
    return { error: "PIN kodu 4 haneli olmalıdır." };
  }

  // 1. Login isteği
  const loginRes = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tcNo, pin }),
  });

  const loginPayload = (await loginRes.json()) as {
    success?: boolean;
    data?: { user: AdminUser } & TokenBundle;
    error?: string;
  };

  if (!loginRes.ok || !loginPayload.data) {
    return {
      error: loginPayload.error || "Giriş yapılamadı. Bilgilerinizi kontrol edin.",
    };
  }

  // 2. /me ile rol doğrulama
  const meRes = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${loginPayload.data.accessToken}` },
  });

  const mePayload = (await meRes.json()) as {
    success?: boolean;
    data?: AdminUser;
  };

  if (!meRes.ok || mePayload.data?.role !== "ADMIN") {
    return { error: "Bu panel sadece yönetici kullanıcılar içindir." };
  }

  // 3. Session cookie yaz
  const session: StoredSession = {
    accessToken: loginPayload.data.accessToken,
    refreshToken: loginPayload.data.refreshToken,
    expiresIn: loginPayload.data.expiresIn,
    user: {
      ...loginPayload.data.user,
      ...mePayload.data,
    },
  };

  await setServerSession(session);

  // 4. Redirect — execution stops here
  redirect("/admin");
}

export async function logoutAction() {
  const { getServerSession } = await import("@/lib/session");
  const session = await getServerSession();

  // Backend'e logout bildirimi
  if (session?.accessToken) {
    try {
      await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    } catch {
      // Sessiz hata — cookie zaten temizlenecek
    }
  }

  await clearServerSession();
  redirect("/login");
}
