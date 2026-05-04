# TODO — UI ve Bug Backlog

UI inceleme oturumunda bulunan ve henüz fix'lenmemiş sorunlar. Sprint sonu cleanup'ında ele alınacak.

Tarih: 2026-04-30 (incelemenin yapıldığı tarih)

---

## 🔴 Kritik

### 1. Attendance sayfasında useEffect döngüsü
**Dosya:** [frontend/src/app/admin/attendance/page.tsx:131](frontend/src/app/admin/attendance/page.tsx#L131)

`selectedSessionId` hem `useEffect` deps array'inde hem de effect içinde `setSelectedSessionId(nextSessionId)` ile set ediliyor. Sonuç: filtre değişince oturum listesi yüklenir → `setSelectedSessionId` → effect tekrar tetiklenir → 2x backend isteği.

Edge case'lerde N kez fetch riski.

**Fix:** `selectedSessionId`'i deps'ten çıkar. Session detail load'unu ya ayrı bir effect'e ya da `Select.onValueChange` handler'ına bırak.

### 2. AdminGuard backend down olduğunda cookie role'üne güvenir
**Dosya:** [frontend/src/components/app/admin-guard.tsx:40-45](frontend/src/components/app/admin-guard.tsx#L40-L45)

```ts
} catch {
  if (session.user && session.user.role === "ADMIN") {
    return session.user;
  }
}
```

Cookie non-httpOnly (apiRequest okuyabilsin diye). Kullanıcı kendi cookie'sinde `role: "ADMIN"` set edip backend down olduğu anda admin paneli açabilir. Sayfa data çekemeyince boş olur ama hassas UI elementleri görünür ve client-side state manipüle edilebilir.

**Fix:** catch'te de `clearServerSession()` + `redirect("/login")`.

### 3. `students.length` totalı yansıtmıyor
**Dosya:** [frontend/src/app/admin/page.tsx](frontend/src/app/admin/page.tsx) (Dashboard "Toplam Öğrenci")

`apiRequest("/api/v1/students?limit=100")` çağrılıyor ama yanıttaki `pagination.total` kullanılmıyor — sadece `students.length` ile sayım yapılıyor. 100'ün üstü öğrenci varsa Dashboard "Toplam Öğrenci 100" gösterir, yanlış sayı.

Aynı bug muhtemelen başka yerlerde de var (courses, cards, sessions sayım'ları için). Grep gerekli.

**Fix:** Endpoint'leri `limit=1` ile çağır ve sadece `pagination.total`'i oku. Ya da listeyi alıp sadece total değerini sayım için kullan.

---

## 🟡 Orta

### 4. AuthProvider kullanılmıyor ama her sayfada bootstrap çalıştırıyor
**Dosyalar:**
- [frontend/src/components/app/auth-provider.tsx](frontend/src/components/app/auth-provider.tsx)
- [frontend/src/components/app/providers.tsx:11](frontend/src/components/app/providers.tsx#L11)

`AuthProvider` root'ta yüklü ama hiçbir component `useAuth()` çağırmıyor. Yine de mount olunca `fetchMe()` çalışıyor. Sonuç: her admin sayfa load'unda **2 ayrı `/api/v1/auth/me` request** (admin-guard server-side + AuthProvider client-side bootstrap).

**Fix:** Ya `<AuthProvider>` wrapper'ını `providers.tsx`'ten çıkar ve dosyaları sil; ya da gerçekten ihtiyaç varsa kullanılan yerleri belirle.

### 5. SessionSyncer redundant + XSS yüzeyi
**Dosya:** [frontend/src/components/app/session-syncer.tsx](frontend/src/components/app/session-syncer.tsx)

`setServerSession` cookie'yi httpOnly:false + path:/ ile yazıyor; browser bir sonraki request'te otomatik gönderir. SessionSyncer ek olarak inline script çıkarıyor — `if (!found)` kontrolü yüzünden hiçbir şey yapmıyor genelde.

XSS yüzeyi: `JSON.stringify(JSON.stringify(session))` çift encode ediyor ama `</script>` token'ını user data'da escape etmiyor. firstName backend kontrolü altında ama theoretical.

**Fix:** Component'i tamamen sil, `admin/layout.tsx` ve `student/layout.tsx`'ten kaldır.

### 6. Students/[id] detail sayfa eski stil
**Dosya:** [frontend/src/app/admin/students/[id]/page.tsx](frontend/src/app/admin/students/[id]/page.tsx)

UI refactor sırasında atlanmış. Hâlâ `rounded-[2rem]`, `text-2xl font-semibold`, `size="lg"` butonlar var. Diğer admin sayfalarıyla görsel tutarsızlık.

**Fix:** Diğer sayfalarla aynı standardı uygula:
- `rounded-[2rem]` → `rounded-xl`
- `text-2xl font-semibold` → `text-base font-semibold`
- `size="lg"` butonlar → default
- `rounded-[1.5rem]` iç bloklar → `rounded-xl`
- Badge'ler `px-3 py-1 text-sm` → `rounded px-1.5 py-0 text-[10px]`

### 7. ConfirmDialog cancel butonu loading'de disable değil
**Dosya:** [frontend/src/components/app/confirm-dialog.tsx:49](frontend/src/components/app/confirm-dialog.tsx#L49)

Submit edilirken kullanıcı vazgeçer → dialog kapanır → API isteği arka planda devam eder → işlem yine de gerçekleşir, kullanıcı kafası karışır.

**Fix:** `<AlertDialogCancel disabled={loading}>` ekle.

### 8. Yoklama auto-refresh açık dialog'u ezer
**Dosya:** [frontend/src/app/admin/attendance/page.tsx:138-149](frontend/src/app/admin/attendance/page.tsx#L138)

15 saniyede bir `loadSessionDetail` çalışıyor → `setSessionDetail` ile attendanceList replace. Eğer `pendingAttendance` confirm dialog'u açıksa, dialog hâlâ eski item state'ini gösterir, confirm'e basınca yanlış değer gönderebilir.

**Fix:** `pendingAttendance` set'liyken auto-refresh skip et:
```ts
if (pendingAttendance || document.visibilityState !== "visible") return;
```

### 9. Login için brute-force koruması yok
**Dosya:** Backend `auth.routes.ts` (rate limiter)

PIN sadece 4 haneli (10000 kombinasyon). `generalLimiter` var ama login için spesifik daha sıkı limit yok. Defansif olarak 5 deneme/15dk gibi bir limit gerekli.

**Fix:** Backend'de `loginLimiter` (5 req / 15 min, IP+tcNo bazlı) ekle, `/auth/login` route'una uygula.

---

## 🟢 Küçük

### 10. Dashboard "Ortalama Katılım" mislabel
**Dosya:** [frontend/src/app/admin/page.tsx](frontend/src/app/admin/page.tsx)

"Ortalama Katılım %X" yazıyor + alt satırda "X dersi referans alındı" — ama sadece ilk dersin oranı. "Ortalama" değil, "İlk dersin oranı" ya da gerçekten aktif derslerin ortalaması alınmalı.

**Fix:** Backend `/reports/attendance-summary` her ders için ayrı çağrılıp ortalama alınabilir, ya da label "İlk aktif ders" olarak düzeltilebilir.

### 11. `formatPercentage` `null/NaN` için "%0" döner
**Dosya:** [frontend/src/lib/format.ts:44-50](frontend/src/lib/format.ts#L44)

"Henüz veri yok" ile "0% katılım" karıştırılıyor. Dashboard'da yeni dönem başında kafa karıştırır.

**Fix:** `null/undefined/NaN` durumunda `"—"` döndür.

### 12. `combineDateAndTime` browser timezone'una bağlı
**Dosya:** [frontend/src/lib/format.ts:88-92](frontend/src/lib/format.ts#L88)

`new Date(year, month-1, ...)` browser yerel timezone'unda. Admin yurtdışından çalışırsa session tarihleri yanlış kayıt olur.

**Fix:** Europe/Istanbul'a sabitlemek ya da `T${time}:00` ISO string olarak server'a göndermek (sunucu timezone'da işler).

### 13. Türkçe karakter eksikliği toast/dialog metinlerinde
**Dosyalar:** `students/[id]/page.tsx`, `cards/page.tsx`, `attendance/page.tsx` — eski toastlarda "Ogrenci", "yuklendi", "Vazgec" var.

UX tutarsızlık. Sıkıcı bulk replace iş.

**Fix:** Her dosyada toast/dialog stringlerini geçilen incelemede düzelt.

### 14. Login responsive sıkışma
**Dosya:** [frontend/src/app/login/page.tsx:21](frontend/src/app/login/page.tsx#L21)

`lg:grid-cols-[1.1fr_0.9fr]` — sol panel `Rahat/Güvenli` stat kartları `lg`'de iki sütun ama tablet (md) breakpoint'te tek sütun → panel uzar, sağ form çok daha kısa kalır → görsel olarak dengesiz.

**Fix:** Stat kartlarını `sm:grid-cols-2`'e çek, panel boyu kısalsın.

### 15. Backend `tcNo` decrypt fail olunca `'***'` döndürüyor
**Dosya:** [backend/src/controllers/student.controller.ts:221](backend/src/controllers/student.controller.ts#L221)

Frontend `student.tcNo || "-"` ile render ediyor → `'***'` literal görünür. Eski/bozuk encrypted veriler için.

**Fix:** Frontend'de `tcNo === '***'` kontrolü, "Veri okunamadı" göster. Veya backend `null` döndürsün.

---

## 📋 Sayfa olarak hiç kontrol edilmediler

Bu sayfalara dokunmadım/inceleme yapmadım:
- `/admin/students/[id]` — sadece UI tutarsızlığı baktım, fonksiyonel olarak test edilmedi
- Notification dropdown / detayı — backend var ama frontend mounted değil mi?
- `/api/v1/reports/*` endpoint'leri — sadece pass-fail CSV kullanılıyor, summary chart kullanım yerini bulamadım

---

## ✅ Yapıldı (referans için)

Bu oturumda fix'lenenler:
- UI overhaul: radius/typography/button standardize, attendance segmented control, dashboard kompakt, students/cards/courses tabs+layout fix
- Material akışı: proxy binary-safe, getMaterialById STUDENT enrollment guard, my-courses raw url leak fix, path traversal koruma, multer courseId zorunlu, student PDF download fetch+blob
- CLAUDE.md: proxy binary uyarısı + material storage bölümü + uploads ephemeral notu
