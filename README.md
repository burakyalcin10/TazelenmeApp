# TazelenmeApp

> 🎓 Tazelenme Üniversitesi — Öğrenci Yönetim ve Yoklama Otomasyon Sistemi

60+ yaş grubunun eğitim gördüğü Tazelenme Üniversitesi için tasarlanmış, RFID/Barkod kartları ile dijital yoklama, sağlık verisi yönetimi ve sosyal izolasyon alarmları üreten bir otomasyon sistemidir.

## Mimari

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  (Next.js)   │     │  (Express)   │     │              │
│   PWA + Admin│◀────│  REST API    │◀────│   Prisma ORM │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │  IoT Cihazı  │
                     │ ESP8266+RC522│
                     └──────────────┘
```

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Veritabanı | PostgreSQL |
| IoT | ESP8266 / ESP32 + RC522 RFID |
| Altyapı | Docker, Docker Compose |

## Hızlı Başlangıç

### Gereksinimler

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) v18+ (geliştirme için)

### Kurulum

```bash
# Repo'yu klonla
git clone <repo-url>
cd TazelenmeApp

# Tüm sistemi Docker ile ayağa kaldır
docker-compose up -d

# Uygulamalar:
# Frontend  → http://localhost:3000
# Backend   → http://localhost:4000
# PostgreSQL → localhost:5432
```

### Geliştirme (Docker olmadan)

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend (ayrı terminalde)
cd frontend
npm install
npm run dev
```

## Proje Yapısı

```
TazelenmeApp/
├── frontend/          # Next.js (PWA + Admin Panel)
├── backend/           # Express.js (TypeScript) API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── prisma/
│       └── schema.prisma
├── docker-compose.yml
├── Requirements.md
└── README.md
```

## Lisans

Bu proje Tazelenme Üniversitesi sosyal sorumluluk projesi kapsamında geliştirilmektedir.
