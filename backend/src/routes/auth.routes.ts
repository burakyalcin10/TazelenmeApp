import { Router } from 'express';
import { login, refreshToken, logout, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * Auth Routes
 * Base path: /api/v1/auth
 */

// POST /api/v1/auth/login — TC + PIN ile giriş (rate limited)
router.post('/login', authLimiter, login);

// POST /api/v1/auth/refresh — Refresh token ile yeni token al
router.post('/refresh', refreshToken);

// POST /api/v1/auth/logout — Çıkış (auth gerekli)
router.post('/logout', authenticate, logout);

// GET /api/v1/auth/me — Mevcut kullanıcı bilgisi (auth gerekli)
router.get('/me', authenticate, getMe);

export default router;
