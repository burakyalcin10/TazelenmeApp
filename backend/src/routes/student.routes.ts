import { Router } from 'express';
import multer from 'multer';
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  importStudents,
} from '../controllers/student.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Student Routes
 * Base path: /api/v1/students
 * Tüm endpoint'ler ADMIN yetkisi gerektirir
 */

// CSV upload için multer config (memory storage — dosya disk'e yazılmaz)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece CSV dosyaları kabul edilmektedir.'));
    }
  },
});

// ── CRUD Routes ──

// POST /api/v1/students/import — CSV toplu import (import route'u /:id'den önce olmalı)
router.post('/import', authenticate, authorize('ADMIN'), upload.single('file'), importStudents);

// POST /api/v1/students — Yeni öğrenci oluştur
router.post('/', authenticate, authorize('ADMIN'), createStudent);

// GET /api/v1/students — Öğrenci listesi (filtreleme, pagination)
router.get('/', authenticate, authorize('ADMIN'), getStudents);

// GET /api/v1/students/:id — Öğrenci detay
router.get('/:id', authenticate, authorize('ADMIN'), getStudentById);

// PUT /api/v1/students/:id — Öğrenci güncelleme
router.put('/:id', authenticate, authorize('ADMIN'), updateStudent);

// DELETE /api/v1/students/:id — Soft delete
router.delete('/:id', authenticate, authorize('ADMIN'), deleteStudent);

export default router;
