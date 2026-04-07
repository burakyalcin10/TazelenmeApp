import { Router } from 'express';
import { getMyCourses, getMyAttendance } from '../controllers/student-portal.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Student Portal Routes
 * Base path: /api/v1/student
 * Tüm endpoint'ler STUDENT yetkisi gerektirir
 */

// GET /api/v1/student/my-courses — Öğrencinin kayıtlı dersleri + materyaller
router.get('/my-courses', authenticate, authorize('STUDENT'), getMyCourses);

// GET /api/v1/student/my-attendance — Öğrencinin devamsızlık özeti
router.get('/my-attendance', authenticate, authorize('STUDENT'), getMyAttendance);

export default router;
