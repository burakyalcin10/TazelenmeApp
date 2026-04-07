import { Router } from 'express';
import {
  createEnrollment,
  bulkEnrollment,
  getEnrollments,
  deleteEnrollment,
} from '../controllers/enrollment.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Enrollment Routes
 * Base path: /api/v1/enrollments
 * Tüm endpoint'ler ADMIN yetkisi gerektirir
 */

// POST /api/v1/enrollments/bulk — Toplu kayıt (bulk route /:id'den ÖNCE)
router.post('/bulk', authenticate, authorize('ADMIN'), bulkEnrollment);

// POST /api/v1/enrollments — Tek kayıt
router.post('/', authenticate, authorize('ADMIN'), createEnrollment);

// GET /api/v1/enrollments — Kayıt listesi
router.get('/', authenticate, authorize('ADMIN'), getEnrollments);

// DELETE /api/v1/enrollments/:id — Kayıt sil
router.delete('/:id', authenticate, authorize('ADMIN'), deleteEnrollment);

export default router;
