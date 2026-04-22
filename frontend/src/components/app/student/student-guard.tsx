import { redirect } from "next/navigation";

import { clearServerSession, getServerSession } from "@/lib/session";
import type { AdminUser } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/env";

/**
 * Server-side öğrenci oturum doğrulaması.
 * Geçerli oturum yoksa /login'e yönlendirir.
 * Geçerli oturum varsa user bilgisini döner.
 */
export async function verifyStudentSession(): Promise<AdminUser> {
  const session = await getServerSession();

  if (!session?.accessToken) {
    redirect("/login");
  }

  // /me ile kullanıcı doğrulama
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      await clearServerSession();
      redirect("/login");
    }

    const payload = (await res.json()) as { data?: AdminUser };

    if (!payload.data || payload.data.role !== "STUDENT") {
      // ADMIN ise admin paneline yönlendir
      if (payload.data?.role === "ADMIN") {
        redirect("/admin");
      }
      await clearServerSession();
      redirect("/login");
    }

    return payload.data;
  } catch {
    // API erişilemiyorsa, cookie'deki kullanıcı bilgisini kullan (fallback)
    if (session.user && session.user.role === "STUDENT") {
      return session.user;
    }
    await clearServerSession();
    redirect("/login");
  }
}
