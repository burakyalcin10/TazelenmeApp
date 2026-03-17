import { Router } from 'express';
import { assignCard, updateCardStatus, listCards, getStudentCards } from '../controllers/card.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Card Routes
 * Base path: /api/v1/cards
 */

// POST /api/v1/cards — Yeni kart atama
router.post('/', authenticate, authorize('ADMIN'), assignCard);

// PATCH /api/v1/cards/:id/status — Kart durumu güncelleme
router.patch('/:id/status', authenticate, authorize('ADMIN'), updateCardStatus);

// GET /api/v1/cards — Tüm kartları listele
router.get('/', authenticate, authorize('ADMIN'), listCards);

// GET /api/v1/cards/student/:studentId — Öğrencinin kartları
router.get('/student/:studentId', authenticate, authorize('ADMIN'), getStudentCards);

export default router;
