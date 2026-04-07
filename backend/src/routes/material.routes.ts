import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadMaterial,
  getMaterials,
  getMaterialById,
  deleteMaterial,
  downloadMaterial,
} from '../controllers/material.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Material Routes
 * Base path: /api/v1/materials
 */

// Multer config — PDF dosyaları için disk storage
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const courseId = req.body.courseId || 'unknown';
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'materials', courseId);
    // Dizin yoksa oluştur
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Max 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece PDF dosyaları kabul edilmektedir.'));
    }
  },
});

// POST /api/v1/materials — Materyal yükle (PDF dosya veya link)
router.post('/', authenticate, authorize('ADMIN'), upload.single('file'), uploadMaterial);

// GET /api/v1/materials — Materyal listesi
router.get('/', authenticate, authorize('ADMIN'), getMaterials);

// GET /api/v1/materials/:id — Materyal detay
router.get('/:id', authenticate, getMaterialById);

// GET /api/v1/materials/:id/download — PDF indirme (ADMIN veya STUDENT)
router.get('/:id/download', authenticate, downloadMaterial);

// DELETE /api/v1/materials/:id — Materyal sil
router.delete('/:id', authenticate, authorize('ADMIN'), deleteMaterial);

export default router;
