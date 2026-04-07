# TazelenmeApp

> Tazelenme Universitesi ogrenci yonetim, yoklama ve mini-LMS sistemi

TazelenmeApp, 60+ yas grubunun egitim gordugu Tazelenme Universitesi icin tasarlanmis bir otomasyon sistemidir. RFID kart ile yoklama, ogrenci ve saglik verisi yonetimi, devamsizlik riski bildirimi ve ders materyali dagitimi tek bir yapida toplanir.

## Guncel Durum

Sprint 1, Sprint 2 ve Sprint 3 backend kapsami tamamlandi.

Son guncelleme ile:

- Sprint 3 migration dosyalari repo'ya eklendi ve veritabanina uygulandi
- Classroom yonetimi icin `CRUD /api/v1/classrooms` endpoint'leri eklendi
- Manuel yoklama akisina enrollment kontrolu eklendi
- Docker uzerinde backend yeniden build edilip smoke test ile dogrulandi

## Sprint 3 Kapsami

Sprint 3 ile gelen baslica yetenekler:

- Bildirim listeleme ve durum guncelleme endpoint'leri
- Ders CRUD, classroom CRUD, ogrenci-ders kaydi ve toplu oturum uretimi
- PDF ve link bazli materyal yukleme
- Ogrenci portali icin `my-courses` ve `my-attendance` endpoint'leri
- `%70` katilim kuraliyla gecti-kaldi raporu
- Haftalik izolasyon/devamsizlik taramasi icin cron job
- KVKK odakli `tcNoEncrypted` ve `tcNoHash` yapisi

## Smoke Test Sonucu

Canli ortamda dogrulanan akislardan bazilari:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/students`
- `POST /api/v1/courses`
- `POST /api/v1/classrooms`
- `POST /api/v1/enrollments`
- `POST /api/v1/sessions`
- `POST /api/v1/cards`
- `POST /api/v1/attendance/scan`
- `GET /api/v1/student/my-courses`
- `GET /api/v1/student/my-attendance`
- `GET /api/v1/reports/pass-fail`
- `GET /api/v1/reports/attendance-summary`
- `GET/PATCH /api/v1/notifications`

Not:

- Manuel yoklama artik derse kayitli olmayan ogrenci icin hata doner.
- Temiz veritabani ile baslangicta en az 1 admin kullanici gerekir.

## Mimari

```text
Frontend (Next.js)
  -> Backend API (Express + TypeScript)
    -> PostgreSQL (Prisma)
    -> IoT cihazlari (ESP8266 / RC522)
```

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Veritabani | PostgreSQL |
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
docker-compose up --build -d
```

Servisler:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5433`

Notlar:

- Backend container acilirken `npx prisma migrate deploy` calistirir.
- Upload edilen materyaller Docker volume olarak `tazelenme-uploads` icinde tutulur.

### Lokal Gelistirme

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

Ayrica ayri terminalde:

```bash
cd frontend
npm install
npm run dev
```

## Veritabani ve Migration

Sprint 3 migration dosyasi:

- `backend/prisma/migrations/20260408000000_sprint3_kvkk_encryption/migration.sql`

Docker tabanli akista migration uygulamak icin:

```bash
docker-compose up --build -d
```

Sadece migration deploy etmek isterseniz:

```bash
docker exec -e DATABASE_URL="postgresql://tazelenme:tazelenme_secret@db:5432/tazelenme_db?schema=public" tazelenme-backend npx prisma migrate deploy
```

Notlar:

- Windows + Docker Desktop ortaminda host makineden `npx prisma migrate dev` komutu `localhost:5433` baglantisinda sorun cikarabilir.
- Bu projede en sorunsuz akis Docker container icinden `migrate deploy` calistirmaktir.

## Ilk Kurulum Notu

Sistem sifir veritabani ile aciliyorsa:

- en az 1 `ADMIN` kullanici gereklidir
- session planlamak icin en az 1 classroom kaydi gereklidir

Classroom yonetimi artik API uzerinden yapilabilir:

- `POST /api/v1/classrooms`
- `GET /api/v1/classrooms`
- `GET /api/v1/classrooms/:id`
- `PUT /api/v1/classrooms/:id`
- `DELETE /api/v1/classrooms/:id`

## Proje Yapisi

```text
TazelenmeApp/
|-- frontend/
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
