import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * Farklı endpoint türleri için ayrı sınırlamalar
 */

/**
 * Genel API rate limiter — dakikada 600 istek.
 * Not: Frontend tüm çağrıları /api/v1 proxy'si üzerinden yaptığı için backend
 * hepsini tek IP'den (frontend container) görür; bu yüzden per-IP limit fiilen
 * global olur. Panel gezinme + otomatik yenileme için 600/dk rahat bir tavan.
 */
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 600,
  message: {
    success: false,
    error: 'Çok fazla istek gönderildi. Lütfen bir süre bekleyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Auth (login) rate limiter — dakikada 10 deneme (brute-force koruması) */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 10,
  message: {
    success: false,
    error: 'Çok fazla giriş denemesi. 1 dakika sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** IoT cihaz rate limiter — dakikada 300 istek (200 kişilik amfi + tolerans) */
export const iotLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 300,
  message: {
    success: false,
    error: 'Cihazdan çok fazla istek geldi.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
