# TazelenmeApp

> Tazelenme Universitesi icin ogrenci yonetimi, RFID/NFC yoklama ve mini-LMS platformu.

TazelenmeApp, 60+ yas grubunun egitim aldigi Tazelenme Universitesi icin gelistirilen bir otomasyon sistemidir. Ogrenci kayitlari, ders ve sinif planlama, RFID kart yonetimi, anlik yoklama, ders materyalleri, bildirimler ve raporlari tek yapida toplar.

## Son Eklenenler

Bu surumde proje donanim demosuna hazir hale getirildi.

- Raspberry Pi + RC522 RFID/NFC okuyucu entegrasyonu eklendi.
- Pi uzerinde calisan `tazelenme-rfid` systemd servisi hazirlandi.
- Kart UID'si backend'e `POST /api/v1/attendance/scan` endpoint'i ile gonderiliyor.
- `AUTO` lokasyon modu eklendi: okuyucu belirli bir sinifa sabitlenmeden, kart sahibinin kayitli oldugu acik yoklama oturumunu otomatik buluyor.
- Yoklama ekraninda 15 saniyelik yenileme yerine 1 saniyelik canli polling yapildi.
- Daha once `ABSENT` veya `EXCUSED` gorunen kayitlar RFID okutulunca `PRESENT / RFID` olarak guncelleniyor.
- Sunum icin SSH reverse tunnel araci eklendi: `tools/rfid_gateway/reverse_tunnel.py`.
- RFID demo kurulum dokumani eklendi: `tools/rfid_gateway/README.md`.

## RFID Donanim Demo Akisi

Sunumda beklenen ana akisi:

1. Bilgisayarda Docker servislerini baslat.
2. Raspberry Pi'ye guc ver.
3. Backend tunnel'i ac.
4. Admin panelde yoklama oturumunu baslat.
5. NFC karti RC522 okuyucuya okut.
6. Yoklama ekraninda ogrenci `Geldi` olur.

### Bilgisayarda Uygulamayi Baslat

PowerShell:

```powershell
cd C:\Users\burak\OneDrive\Masaustu\TazelenmeApp
docker compose up -d
```

Saglik kontrolu:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Admin panel:

```text
http://localhost:3000/login
```

### Raspberry Pi Kontrolu

SSH:

```powershell
ssh burak@rfid-pi.local
```

Alternatif olarak IP ile:

```powershell
ssh burak@192.168.1.121
```

RFID servisi:

```bash
systemctl status tazelenme-rfid
journalctl -u tazelenme-rfid -f
```

### Backend Tunnel

Windows Firewall yerel agdan `4000` portunu engelleyebildigi icin Pi, demo sirasinda backend'e SSH reverse tunnel ile ulasir.

Bilgisayarda ayri bir PowerShell penceresinde:

```powershell
cd C:\Users\burak\OneDrive\Masaustu\TazelenmeApp
python tools\rfid_gateway\reverse_tunnel.py --host 192.168.1.121 --user burak --password burak --remote-host 127.0.0.1 --remote-port 4000 --local-host 127.0.0.1 --local-port 4000
```

Basarili cikti:

```text
remote 127.0.0.1:4000 -> local 127.0.0.1:4000
```

Bu pencere demo boyunca acik kalmali.

`TCP forwarding request denied` hatasi gelirse tunnel zaten acik olabilir. Eski tunnel'i kapatmak icin:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'python.exe'" |
  Where-Object { $_.CommandLine -like '*reverse_tunnel.py*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

### Pi RFID Ayari

Pi'deki ayar dosyasi:

```bash
cat /home/burak/tazelenme-rfid/tazelenme-rfid.env
```

Beklenen demo ayari:

```env
TAZELENME_API_URL=http://127.0.0.1:4000
TAZELENME_IOT_API_KEY=iot_secret_change_me
TAZELENME_DEVICE_LOCATION=AUTO
```

`AUTO` modunda Pi tarafinda sinif degistirmek gerekmez. Backend, kart sahibinin kayitli oldugu acik yoklama oturumunu bulur.

Sabit lokasyon kullanmak gerekirse sinif kodlari:

```text
AMFI_1          -> Amfi 1
AMFI_TEST       -> Amfi Test
DIJITAL_LAB     -> Dijital Laboratuvar
LAB_SMOKE       -> Lab Test Smoke
SANAT_SINIFI    -> Sanat Sinifi
SEMINER_SALONU  -> Seminer Salonu
YASAM_ATOLYESI  -> Yasam Atolyesi
```

Ayar degistiyse:

```bash
sudo systemctl restart tazelenme-rfid
```

### Demo Sirasinda

1. Admin panelde `Yoklama` sayfasina gir.
2. Ders oturumunu sec.
3. `Yoklamayi baslat` butonuna bas.
4. Kart veya NFC etiketi RC522 okuyucuya yaklastir.
5. Liste 1 saniyelik canli yenileme ile otomatik guncellenir.

Basarili Pi log ornegi:

```text
{"event":"card_read","uid":"83432021"}
{"event":"attendance_response","status_code":200}
```

Demo anlatim cumlesi:

```text
Raspberry Pi uzerindeki RC522 okuyucu kart UID'sini okuyor, backend'e gonderiyor; backend aktif yoklama oturumunu bulup ogrencinin yoklamasini RFID olarak isliyor.
```

## Proje Ozeti

### Admin Panel

- Unified login: admin ve ogrenci ayni ekrandan giris yapar.
- Role-based redirect: admin paneli ve ogrenci portali ayrilir.
- Dashboard KPI kartlari, bildirimler ve katilim grafigi.
- Ogrenci listeleme, olusturma, guncelleme ve pasif yapma.
- Ogrenci detayinda ders, yoklama ve kart gecmisi.
- CSV ile toplu ogrenci import ve export.
- Ders, sinif, oturum, kayit ve materyal yonetimi.
- Manuel yoklama ve RFID yoklama.
- Kart atama, kayip/iptal kart durumlari.
- Rapor export akislari.

### Ogrenci Portali

- 60+ yas grubu icin mobile-first PWA.
- Buyuk butonlar, okunabilir tipografi ve rahat dokunma alanlari.
- Derslerim ve devamsizlik sayfasi.
- Materyal sayfasi: PDF, video ve link icerikleri.
- Risk uyarilari ve katilim orani.

### RFID / IoT

- RC522 okuyucu SPI uzerinden Raspberry Pi'ye baglanir.
- Pi Python gateway UID okur ve backend'e gonderir.
- Backend karti ogrenciyle eslestirir.
- Aktif yoklama oturumu bulunur.
- Anti-passback ile ayni oturumda tekrar kayit engellenir.
- Var olan `ABSENT` kayit RFID ile `PRESENT` yapilabilir.

## Mimari

```text
Frontend (Next.js App Router + React + Tailwind)
  -> Backend API (Express + TypeScript)
    -> PostgreSQL (Prisma)
    -> Upload storage (Docker volume)
    -> RFID Gateway (Raspberry Pi + RC522)
```

## Teknoloji Stack

| Katman | Teknoloji |
| --- | --- |
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Veritabani | PostgreSQL |
| Auth | JWT access + refresh token |
| IoT | Raspberry Pi, RC522, Python, systemd |
| Otomasyon | node-cron |
| Dosya yukleme | multer |
| Altyapi | Docker, Docker Compose |

## Demo Bilgileri

### Admin Girisi

```text
TC No: 11111111111
PIN: 1234
```

### Ogrenci Girisi

Ogrenci hesaplarinda ilk PIN, TC kimlik numarasinin son 4 hanesidir.

Ornek:

```text
TC No: 39900000001
PIN: 0001
```

### Canli Demo

```text
Frontend: https://tazelenme-app.vercel.app
Backend:  https://tazelenme-backend.onrender.com/api/health
```

Not: Render free tier soguyan serviste ilk istek 10-30 saniye surebilir.

## Hizli Baslangic

### Gereksinimler

- Docker Desktop
- Node.js 20+
- npm

### Docker ile Calistirma

```bash
docker compose up --build -d
```

Servisler:

```text
Frontend:   http://localhost:3000
Backend:    http://localhost:4000
PostgreSQL: localhost:5433
```

Durum kontrolu:

```bash
docker ps
```

Loglar:

```bash
docker logs tazelenme-frontend --tail 100
docker logs tazelenme-backend --tail 100
```

Durdurma:

```bash
docker compose down
```

### Lokal Gelistirme

Veritabani Docker ile acik kalirken backend ve frontend lokal calistirilabilir.

DB:

```bash
docker compose up -d db
```

Backend:

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Veritabani ve Seed

Backend container acilirken migration ve seed otomatik calisir.

Migration durumu:

```bash
docker exec -it tazelenme-backend npx prisma migrate status
```

Seed:

```bash
docker exec -it tazelenme-backend npm run prisma:seed
```

## Sunum Akisi

1. `http://localhost:3000/login` uzerinden admin girisi yap.
2. Dashboard KPI kartlarini ve grafikleri goster.
3. Ogrenciler ekraninda yeni ogrenci, CSV import/export ve detay akisini goster.
4. Dersler ekraninda course/session/material yonetimini goster.
5. Yoklama ekraninda oturum baslat.
6. RFID karti okut ve listeyi canli yenilemeyle goster.
7. Kartlar ekraninda kart atama ve durum degistirme akisini goster.

## Dogrulama

Son dogrulanan komutlar:

```bash
cd backend && npm run build
cd frontend && npm run lint
cd frontend && npm run build
```

Not: Frontend lint komutu mevcut repoda yalnizca onceki unused import uyarilari vermektedir; hata yoktur.

## Proje Yapisi

```text
TazelenmeApp/
|-- backend/
|   |-- prisma/
|   |-- src/
|   |   |-- controllers/
|   |   |-- jobs/
|   |   |-- middlewares/
|   |   |-- routes/
|   |   `-- utils/
|-- frontend/
|   `-- src/
|       |-- app/
|       |-- components/
|       `-- lib/
|-- tools/
|   |-- generate_hw2_report.py
|   `-- rfid_gateway/
|       |-- rfid_gateway.py
|       |-- reverse_tunnel.py
|       |-- tazelenme-rfid.service
|       `-- README.md
|-- docker-compose.yml
|-- Requirements.md
|-- kanban_board.md
`-- README.md
```

## Lisans

Bu proje Tazelenme Universitesi sosyal sorumluluk calismasi kapsaminda gelistirilmektedir.
