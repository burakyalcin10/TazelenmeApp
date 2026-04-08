# TazelenmeApp

> Tazelenme Universitesi icin ogrenci yonetimi, RFID yoklama ve mini-LMS platformu

TazelenmeApp, 60+ yas grubunun egitim aldigi Tazelenme Universitesi icin tasarlanmis bir otomasyon sistemidir. Proje; ogrenci kayitlari, saglik notlari, RFID kart yonetimi, ders planlama, yoklama, bildirimler ve ders materyallerini tek yapida toplar.

## Proje Durumu

Bu repo su anda sunuma uygun bir `Sprint 4 Admin Panel MVP` durumundadir.

Tamamlanan ana kapsam:

- Sprint 1: temel altyapi, Prisma, auth, Docker
- Sprint 2: ogrenci, kart ve yoklama cekirdek backend akisleri
- Sprint 3: classroom/course/session/material/report/notification backend kapsami
- Sprint 4 Epic 7: admin panel frontend
  - login
  - dashboard
  - ogrenci yonetimi
  - ogrenci detay
  - yoklama yonetimi
  - ders ve materyal yonetimi
  - kart yonetimi
  - CSV import/export

Henuz backlog'da kalan ana alan:

- Sprint 4 Epic 8: ogrenci PWA
- Sprint 5: IoT firmware, test ve dagitim hardening

## Admin Panelde Neler Var

Mevcut admin panel asagidaki akislari destekler:

- Admin login ve token refresh akisi
- Dashboard KPI kartlari, bildirimler, yaklasan oturumlar ve katilim grafigi
- Ogrenci listeleme, olusturma, guncelleme, pasif yapma
- Ogrenci detayinda attendance, enrollment ve kart gecmisi
- CSV ile toplu ogrenci import
- Ogrenci listesini CSV disa aktarma
- Oturum bazli manuel yoklama yonetimi
- Yoklama ekraninda canli yenileme mantigi
- Ders, sinif, session, enrollment ve materyal yonetimi
- Gecti-kaldi raporunu CSV olarak disa aktarma
- Kart atama ve kart durumu guncelleme

## Kisa Mimari

```text
Frontend (Next.js App Router + shadcn/ui)
  -> Backend API (Express + TypeScript)
    -> PostgreSQL (Prisma)
    -> Dosya depolama (Docker volume / uploads)
    -> IoT cihazlari (ileriki sprint)
```

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Veritabani | PostgreSQL |
| Auth | JWT access + refresh token |
| Otomasyon | node-cron |
| Dosya yukleme | multer |
| Altyapi | Docker, Docker Compose |

## Demo Bilgileri

Sunum icin kullanabilecegin admin giris bilgisi:

- Panel: `http://localhost:3000/login`
- TC No: `11111111111`
- PIN: `1234`

Not:

- Demo verisi veritabanina daha once yuklenmis olmalidir.
- Bu bilgiler seed/demonstrasyon amaclidir.

## Hizli Baslangic

### Gereksinimler

- Docker Desktop
- Node.js 20+
- npm

### Docker ile Calistirma

Tum sistemi tek komutla ayaga kaldirmak icin:

```bash
docker compose up --build -d
```

Servisler:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5433`

Container durumunu kontrol etmek icin:

```bash
docker ps
```

Container loglarini gormek icin:

```bash
docker logs tazelenme-frontend --tail 100
docker logs tazelenme-backend --tail 100
```

Servisleri durdurmak icin:

```bash
docker compose down
```

### Lokal Gelistirme

Veritabani Docker ile acik kalirken frontend ve backend'i lokal calistirmak icin:

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

## Veritabani ve Migration

Backend container acilirken migration deploy otomatik uygulanir.

Docker tabanli standart akis:

```bash
docker compose up --build -d
```

Migration durumunu kontrol etmek icin:

```bash
docker exec -it tazelenme-backend npx prisma migrate status
```

Gerekirse seed calistirmak icin:

```bash
docker exec -it tazelenme-backend npm run prisma:seed
```

## Sunumda Gosterebilecegin Ana Akis

1. `http://localhost:3000/login` uzerinden admin girisi yap
2. Dashboard ekraninda KPI kartlari, bildirimler ve grafik alanini goster
3. Ogrenciler ekraninda yeni ogrenci, CSV import/export ve detay akisini goster
4. Yoklama ekraninda oturum secip manuel yoklama akisini goster
5. Dersler ekraninda course/session/material yonetimi ve rapor export'unu goster
6. Kartlar ekraninda kart atama ve durum degistirme akisini goster

## Dogrulama Notlari

Bu asamaya gelirken dogrulanan baslica komutlar:

- `frontend`: `npm run lint`
- `frontend`: `npm run build`
- `backend`: `npm run build`
- Docker uzerinde `frontend`, `backend`, `db` container'lari birlikte calistirildi

## Proje Yapisi

```text
TazelenmeApp/
|-- frontend/
|   `-- src/
|       |-- app/
|       |-- components/
|       `-- lib/
|-- backend/
|   |-- prisma/
|   |   |-- schema.prisma
|   |   `-- migrations/
|   |-- src/
|   |   |-- controllers/
|   |   |-- jobs/
|   |   |-- middlewares/
|   |   |-- routes/
|   |   `-- utils/
|   `-- prisma.config.ts
|-- docker-compose.yml
|-- kanban_board.md
|-- Requirements.md
`-- README.md
```

## Lisans

Bu proje Tazelenme Universitesi sosyal sorumluluk calismasi kapsaminda gelistirilmektedir.
