import { Router } from 'express';
import {
  createSession,
  generateSessions,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from '../controllers/session.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Session Routes
 * Base path: /api/v1/sessions
 * Tüm endpoint'ler ADMIN yetkisi gerektirir
 */

// POST /api/v1/sessions/generate — Toplu oturum üretimi (generate route'u /:id'den ÖNCE)
router.post('/generate', authenticate, authorize('ADMIN'), generateSessions);

// POST /api/v1/sessions — Tek oturum oluştur
router.post('/', authenticate, authorize('ADMIN'), createSession);

// GET /api/v1/sessions — Oturum listesi
router.get('/', authenticate, authorize('ADMIN'), getSessions);

// GET /api/v1/sessions/:id — Oturum detay
router.get('/:id', authenticate, authorize('ADMIN'), getSessionById);

// PUT /api/v1/sessions/:id — Oturum güncelle
router.put('/:id', authenticate, authorize('ADMIN'), updateSession);

// DELETE /api/v1/sessions/:id — Oturum sil
router.delete('/:id', authenticate, authorize('ADMIN'), deleteSession);

export default router;
