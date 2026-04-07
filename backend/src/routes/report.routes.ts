import { Router } from 'express';
import { getPassFailReport, getAttendanceSummary } from '../controllers/report.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Report Routes
 * Base path: /api/v1/reports
 * Tüm endpoint'ler ADMIN yetkisi gerektirir
 */

// GET /api/v1/reports/pass-fail — Geçti/Kaldı raporu
router.get('/pass-fail', authenticate, authorize('ADMIN'), getPassFailReport);

// GET /api/v1/reports/attendance-summary — Yoklama özet raporu
router.get('/attendance-summary', authenticate, authorize('ADMIN'), getAttendanceSummary);

export default router;
