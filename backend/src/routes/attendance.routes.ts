import { Router } from 'express';
import {
  scanCard,
  manualAttendance,
  getSessionAttendance,
  startSessionAttendance,
  stopSessionAttendance,
} from '../controllers/attendance.controller';
import { authenticate, authorize, authenticateDevice } from '../middlewares/auth';
import { iotLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * Attendance Routes
 * Base path: /api/v1/attendance
 */

// POST /api/v1/attendance/scan — IoT cihazdan RFID kart okutma
// Auth: x-api-key (IoT cihaz kimlik doğrulama)
// Rate Limit: dakikada 300 istek (200 kişilik amfi + tolerans)
router.post('/scan', iotLimiter, authenticateDevice, scanCard);

// POST /api/v1/attendance/mobile-scan — Android NFC okuyucu uygulamasi
// Auth: JWT + ADMIN. Global IoT anahtarinin APK icine gomulmesini onler.
router.post('/mobile-scan', iotLimiter, authenticate, authorize('ADMIN'), scanCard);

// POST /api/v1/attendance/manual — Koordinatörün elle yoklama yapması
// Auth: JWT + ADMIN rolü
router.post('/manual', authenticate, authorize('ADMIN'), manualAttendance);

// GET /api/v1/attendance/session/:id — Ders seansı yoklama listesi
// Auth: JWT + ADMIN rolü
router.post('/session/:id/start', authenticate, authorize('ADMIN'), startSessionAttendance);
router.post('/session/:id/stop', authenticate, authorize('ADMIN'), stopSessionAttendance);
router.get('/session/:id', authenticate, authorize('ADMIN'), getSessionAttendance);

export default router;
