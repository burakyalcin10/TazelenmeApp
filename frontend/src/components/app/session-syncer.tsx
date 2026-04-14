"use client";

import { setStoredSession, getStoredSession } from "@/lib/session";
import type { StoredSession } from "@/lib/types";

/**
 * Server-side cookie'den okunan session'ı client-side document.cookie'ye
 * senkronize eder. Inline script olarak çalışır, böylece hiçbir useEffect
 * çalışmadan ÖNCE cookie hazır olur.
 *
 * Bu bileşen hiçbir DOM çıktısı üretmez — sadece bir <script> tag render eder
 * ve bu script hydration öncesinde çalışarak cookie'yi garanti altına alır.
 */
export function SessionSyncer({
  session,
}: {
  session: StoredSession | null;
}) {
  if (!session) {
    return null;
  }

  // Script, hydration öncesinde çalışacak ve cookie'yi ayarlayacak
  const COOKIE_NAME = "tazelenme-session";
  const MAX_AGE = 60 * 60 * 24 * 7; // 7 gün

  const syncScript = `
(function() {
  try {
    var cn = "${COOKIE_NAME}";
    var cookies = document.cookie.split(";");
    var found = false;
    for (var i = 0; i < cookies.length; i++) {
      if (cookies[i].trim().indexOf(cn + "=") === 0) {
        // Cookie mevcut, geçerli mi kontrol et
        var v = cookies[i].split("=").slice(1).join("=").trim();
        try {
          var parsed = JSON.parse(decodeURIComponent(v));
          if (parsed && parsed.accessToken) { found = true; }
        } catch(e) {}
        break;
      }
    }
    if (!found) {
      var val = encodeURIComponent(${JSON.stringify(JSON.stringify(session))});
      document.cookie = cn + "=" + val + "; path=/; max-age=${MAX_AGE}; SameSite=Lax";
    }
  } catch(e) {}
})();
`;

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: syncScript }}
    />
  );
}
