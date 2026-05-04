import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/session";

/**
 * API Proxy Route — Client-side istekleri backend'e yönlendirir.
 *
 * Body ve response'lar binary-safe stream'lenir; multipart upload (PDF) ve
 * stream download (PDF indirme) için .text() / .blob() kullanılmaz.
 */

// fetch() body: ReadableStream gönderebilmek için Node runtime şart (edge'de duplex sorunu var)
export const runtime = "nodejs";

// Backend'den gelen header'ları aktarırken atlanacaklar — fetch / undici bunları zaten yönetiyor
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "expect",
  "te",
  "trailer",
]);

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

  const targetPath = `/api/v1/${path.join("/")}`;
  const { searchParams } = new URL(req.url);
  const queryString = searchParams.toString();
  const targetUrl = `${backendBase}${targetPath}${queryString ? `?${queryString}` : ""}`;

  // İstek header'larını birebir aktar — Content-Type (multipart boundary dahil) korunur
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "host") return; // backend kendi host'unu set etmeli
    if (lower === "authorization") return; // server-side cookie'den ekleyeceğiz
    headers.set(key, value);
  });

  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  try {
    const hasBody = req.method !== "GET" && req.method !== "HEAD";

    const init: RequestInit & { duplex?: "half" } = {
      method: req.method,
      headers,
    };

    if (hasBody) {
      // Body'yi stream olarak aktar — multipart binary bozulmaz
      init.body = req.body;
      init.duplex = "half"; // Node fetch (undici) ReadableStream body için zorunlu
    }

    const backendResponse = await fetch(targetUrl, init);

    // Response header'larını aktar
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      responseHeaders.set(key, value);
    });

    // Response body'yi stream olarak geri ver — PDF/binary korunur
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
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
