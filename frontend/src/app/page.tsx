"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingBlock } from "@/components/app/loading-block";
import { getStoredSession } from "@/lib/session";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const session = getStoredSession();
    router.replace(session?.accessToken ? "/admin" : "/login");
  }, [router]);

  return <LoadingBlock className="min-h-screen" description="Panel hazirlaniyor..." />;
}
