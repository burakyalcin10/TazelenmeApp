import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/session";

/**
 * API Proxy Route — Client-side istekleri backend'e yönlendirir.
 *
 * Client component'ler doğrudan backend'e istek yapmak yerine
 * bu proxy üzerinden geçer. Proxy, server-side cookie'den token'ı
 * okuyarak Authorization header ekler.
 *
 * Bu sayede client-side'da document.cookie okuma sorunları ortadan kalkar.
 *
 * Örnek: GET /api/v1/students → GET http://localhost:4000/api/v1/students
 */

function getBackendBaseUrl(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000"
  );
}

async function proxyHandler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const session = await getServerSession();
  const backendBase = getBackendBaseUrl();

  // Path'i yeniden oluştur: /api/v1/students?limit=100 → http://backend/api/v1/students?limit=100
  const targetPath = `/api/v1/${path.join("/")}`;
  const { searchParams } = new URL(req.url);
  const queryString = searchParams.toString();
  const targetUrl = `${backendBase}${targetPath}${queryString ? `?${queryString}` : ""}`;

  // İstek header'larını kopyala
  const headers = new Headers();
  headers.set("Content-Type", req.headers.get("Content-Type") || "application/json");
  headers.set("Accept", "application/json");

  // Token ekle
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  // User-Agent ve diğer gerekli header'lar
  const userAgent = req.headers.get("User-Agent");
  if (userAgent) {
    headers.set("User-Agent", userAgent);
  }

  try {
    // Body'yi hazırla (GET/HEAD için body yok)
    let body: string | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.text();
    }

    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    // Backend'den gelen yanıtı döndür
    const responseBody = await backendResponse.text();

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[API Proxy] Backend isteği başarısız:", error);
    return NextResponse.json(
      { success: false, error: "Backend sunucusuna ulaşılamıyor." },
      { status: 502 }
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
