export function getApiBaseUrl() {
  // Server-side (server actions, RSC): Backend'e doğrudan eriş
  if (typeof window === "undefined") {
    return (
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000"
    );
  }

  // Client-side (tarayıcı): Same-origin API proxy route üzerinden geç
  // /api/v1/[...path] route handler backend'e proxy yapar ve
  // server-side cookie'den token ekler
  return "";
}
