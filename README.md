# TazelenmeApp

> Tazelenme Universitesi icin ogrenci yonetimi, yoklama, ders materyali ve raporlama platformu.

TazelenmeApp, 60+ yas grubuna yonelik Tazelenme Universitesi programlarinda ogrenci, ders, sinif, yoklama, materyal ve raporlama sureclerini tek sistemde toplamak icin gelistirilmis bir web uygulamasidir. Proje hem koordinatore yonelik bir admin paneli hem de ogrenciler icin sade bir PWA portali icerir.

## Projenin Amaci

Tazelenme Universitesi gibi surekli egitim programlarinda temel ihtiyac, ogrenci bilgisini guvenli tutmak, ders ve sinif planlamasini kolaylastirmak, yoklamayi hizli almak ve devamsizlik risklerini erken fark etmektir. TazelenmeApp bu ihtiyaclari asagidaki hedeflerle karsilar:

- Ogrenci kayitlarini ve saglik notlarini merkezi olarak yonetmek.
- Ders, sinif ve oturum planlamasini tek panelden yapmak.
- Manuel veya RFID/NFC kart ile yoklama almak.
- Ogrencinin derslerini, devamsizlik durumunu ve materyallerini mobil uyumlu portalda gostermek.
- Koordinatorlere rapor, bildirim ve risk takibi saglamak.

## Kullanici Rolleri

### Koordinator / Admin

Admin paneli uzerinden tum operasyonel sureci yonetir:

- Ogrenci olusturma, guncelleme, pasif yapma.
- CSV ile toplu ogrenci import ve export.
- Ders, sinif, oturum ve kayit yonetimi.
- Ders materyali yukleme ve listeleme.
- Manuel yoklama ve RFID yoklama takibi.
- Kart atama, kayip kart ve iptal kart yonetimi.
- Bildirimler, katilim ozeti ve raporlar.

### Ogrenci

Ogrenci portali 60+ yas grubu icin sade ve okunabilir olacak sekilde tasarlanmistir:

- Kendi derslerini gorur.
- Devamsizlik ve katilim oranini takip eder.
- Ders materyallerine ulasir.
- Mobil cihazdan PWA olarak kullanabilir.

## Ana Moduller

### 1. Kimlik Dogrulama

- Admin ve ogrenci ayni login ekranini kullanir.
- JWT access token ve refresh token akisi vardir.
- Role-based redirect ile admin ve ogrenci panelleri ayrilir.
- Ogrenci hesaplarinda ilk PIN, TC kimlik numarasinin son 4 hanesidir.

### 2. Ogrenci Yonetimi

- Ogrenci temel bilgileri, iletisim bilgileri ve acil durum kisisi tutulur.
- Saglik durumu ve ek saglik notlari kaydedilebilir.
- Ogrenci detay ekraninda kartlar, ders kayitlari ve yoklama gecmisi gorulur.
- CSV import/export destegi vardir.

### 3. Ders, Sinif ve Oturum Yonetimi

- Dersler donem bilgisiyle birlikte tanimlanir.
- Siniflar kapasite ve lokasyon kodu ile tutulur.
- Her ders icin haftalik oturumlar olusturulur.
- Oturumlar belirli bir sinif ve zaman araligina baglanir.
- Ogrenciler derslere enrollment kaydi ile eklenir.

### 4. Yoklama Yonetimi

- Koordinator, secili oturum icin yoklamayi baslatip durdurabilir.
- Yoklama listesi 1 saniyelik canli yenileme ile guncellenir.
- Ogrenciler `Geldi`, `Gelmedi`, `Izinli` olarak isaretlenebilir.
- Manuel isaretleme onay dialog'u ile yapilir.
- RFID okutma ile gelen ogrenciler otomatik `PRESENT / RFID` olur.
- Anti-passback sayesinde ayni oturum icin tekrarli kayit olusmaz.

### 5. RFID/NFC Kart Yonetimi

- Her ogrenciye aktif RFID kart atanabilir.
- Kayip veya iptal edilen kartlar sistemde isaretlenebilir.
- Kayip/iptal kart okutulursa backend uyarici bildirim olusturur.
- Raspberry Pi + RC522 okuyucu ile fiziksel kart okutma demosu desteklenir.

### 6. Materyal ve Mini-LMS

- Derslere PDF, video veya link materyali eklenebilir.
- Ogrenci portali uzerinden kendi ders materyallerine erisir.
- PDF indirme akisi binary-safe proxy uzerinden calisir.

### 7. Raporlama ve Bildirim

- Katilim ve gecme-kalma raporlari olusturulur.
- Devamsizlik riski olan ogrenciler icin izolasyon/risk bildirimleri uretilir.
- Bildirimler admin panelinde takip edilebilir.

## Mimari

```text
Frontend (Next.js App Router + React + Tailwind)
  -> Backend API (Express + TypeScript)
    -> PostgreSQL (Prisma)
    -> Upload storage
    -> RFID Gateway (Raspberry Pi + RC522)
```

### Frontend

- Next.js App Router kullanilir.
- Admin panel ve ogrenci portali ayni frontend uygulamasindadir.
- Client tarafindaki API cagrilari `/api/v1/*` proxy rotasindan backend'e iletilir.
- Ogrenci portali PWA olarak tasarlanmistir.

### Backend

- Express + TypeScript ile yazilmistir.
- Tum ana API rotalari `/api/v1/*` altindadir.
- Prisma ORM ile PostgreSQL veritabani kullanilir.
- Auth, ogrenci, ders, sinif, oturum, enrollment, yoklama, kart, materyal, bildirim ve rapor modulleri vardir.

### Veritabani

Temel tablolar:

- `users`
- `student_profiles`
- `courses`
- `classrooms`
- `lesson_sessions`
- `enrollments`
- `attendances`
- `rfid_cards`
- `course_materials`
- `notifications`
- `audit_logs`

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

Container durumunu kontrol etmek icin:

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

## RFID Donanim Demosu

RFID/NFC donanim demosu opsiyoneldir. Demo icin Raspberry Pi uzerinde RC522 okuyucu ve `tazelenme-rfid` servisi kullanilir.

Detayli dosyalar:

```text
tools/rfid_gateway/rfid_gateway.py
tools/rfid_gateway/reverse_tunnel.py
tools/rfid_gateway/tazelenme-rfid.service
tools/rfid_gateway/README.md
```

Pi ayar dosyasi:

```bash
cat /home/burak/tazelenme-rfid/tazelenme-rfid.env
```

Beklenen demo ayari:

```env
TAZELENME_API_URL=http://127.0.0.1:4000
TAZELENME_IOT_API_KEY=iot_secret_change_me
TAZELENME_DEVICE_LOCATION=AUTO
```

`AUTO` modunda Pi tarafinda sinif kodu degistirmek gerekmez. Backend, kart sahibinin kayitli oldugu acik yoklama oturumunu otomatik bulur.

Windows Firewall nedeniyle Pi'nin backend'e erismesi icin sunumda reverse tunnel acilabilir:

```powershell
python tools\rfid_gateway\reverse_tunnel.py --host 192.168.1.121 --user burak --password burak --remote-host 127.0.0.1 --remote-port 4000 --local-host 127.0.0.1 --local-port 4000
```

Mobil hotspot / iPhone aginda Pi'nin IP adresi degisebilir. Bu durumda IP yerine hostname kullan:

```powershell
python tools\rfid_gateway\reverse_tunnel.py --host rfid-pi.local --user burak --password burak --remote-host 127.0.0.1 --remote-port 4000 --local-host 127.0.0.1 --local-port 4000
```

Basarili cikti:

```text
remote 127.0.0.1:4000 -> local 127.0.0.1:4000
```

RFID servis loglari:

```bash
journalctl -u tazelenme-rfid -f
```

### RFID Sunum Komutlari

Sunum esnasinda hizli kopyalamak icin komutlar:

1. Uygulamayi baslat:

```powershell
cd C:\Users\burak\OneDrive\Masaustu\TazelenmeApp
docker compose up -d
```

2. Backend calisiyor mu kontrol et:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

3. Pi agda mi kontrol et:

```powershell
ssh burak@rfid-pi.local
```

IP ile gerekirse:

```powershell
ssh burak@192.168.1.121
```

4. Pi'de RFID servisini kontrol et:

```bash
systemctl status tazelenme-rfid
```

5. Pi RFID ayarini kontrol et:

```bash
cat /home/burak/tazelenme-rfid/tazelenme-rfid.env
```

Beklenen deger:

```env
TAZELENME_DEVICE_LOCATION=AUTO
```

6. Ayar degistiyse servisi yeniden baslat:

```bash
sudo systemctl restart tazelenme-rfid
```

7. Bilgisayarda backend tunnel'i ac:

```powershell
cd C:\Users\burak\OneDrive\Masaustu\TazelenmeApp
python tools\rfid_gateway\reverse_tunnel.py --host 192.168.1.121 --user burak --password burak --remote-host 127.0.0.1 --remote-port 4000 --local-host 127.0.0.1 --local-port 4000
```

Mobil hotspot / iPhone aginda IP degisebilecegi icin sunumda bunu tercih et:

```powershell
cd C:\Users\burak\OneDrive\Masaustu\TazelenmeApp
python tools\rfid_gateway\reverse_tunnel.py --host rfid-pi.local --user burak --password burak --remote-host 127.0.0.1 --remote-port 4000 --local-host 127.0.0.1 --local-port 4000
```

8. Tunnel zaten aciksa kapat:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'python.exe'" |
  Where-Object { $_.CommandLine -like '*reverse_tunnel.py*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

9. Pi'den backend'e ulasim testi:

```bash
curl http://127.0.0.1:4000/api/health
```

10. Kart okuma loglarini izle:

```bash
journalctl -u tazelenme-rfid -f
```

## Sunum Akisi

1. Admin olarak giris yap.
2. Dashboard uzerinden genel durumu goster.
3. Ogrenci yonetiminde ogrenci detaylarini ve kart bilgisini goster.
4. Dersler ekraninda ders, sinif, oturum ve materyal yonetimini goster.
5. Yoklama ekraninda bir oturum baslat.
6. Manuel yoklama veya RFID kart okutma ile `Geldi` durumunu goster.
7. Raporlar ve ogrenci portali ile akisi tamamla.

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
