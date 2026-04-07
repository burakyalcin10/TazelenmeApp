"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/app/auth-provider";
import { LoadingBlock } from "@/components/app/loading-block";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }

    if (status === "authenticated" && user?.role !== "ADMIN") {
      router.replace("/login");
    }
  }, [pathname, router, status, user?.role]);

  if (status === "loading") {
    return <LoadingBlock className="min-h-screen" description="Oturum bilgileriniz kontrol ediliyor..." />;
  }

  if (status !== "authenticated" || user?.role !== "ADMIN") {
    return <LoadingBlock className="min-h-screen" description="Guvenli alana yonlendiriliyorsunuz..." />;
  }

  return <>{children}</>;
}
