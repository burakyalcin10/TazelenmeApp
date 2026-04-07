import { Router } from 'express';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from '../controllers/course.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Course Routes
 * Base path: /api/v1/courses
 * Tüm endpoint'ler ADMIN yetkisi gerektirir
 */

// POST /api/v1/courses — Yeni ders oluştur
router.post('/', authenticate, authorize('ADMIN'), createCourse);

// GET /api/v1/courses — Ders listesi
router.get('/', authenticate, authorize('ADMIN'), getCourses);

// GET /api/v1/courses/:id — Ders detay
router.get('/:id', authenticate, authorize('ADMIN'), getCourseById);

// PUT /api/v1/courses/:id — Ders güncelle
router.put('/:id', authenticate, authorize('ADMIN'), updateCourse);

// DELETE /api/v1/courses/:id — Ders sil (soft delete)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteCourse);

export default router;
