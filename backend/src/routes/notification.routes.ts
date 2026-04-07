import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  updateNotification,
  markAllRead,
} from '../controllers/notification.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Notification Routes
 * Base path: /api/v1/notifications
 * Tüm endpoint'ler ADMIN yetkisi gerektirir
 */

// GET /api/v1/notifications — Bildirim listesi
router.get('/', authenticate, authorize('ADMIN'), getNotifications);

// GET /api/v1/notifications/unread-count — Okunmamış bildirim sayısı
router.get('/unread-count', authenticate, authorize('ADMIN'), getUnreadCount);

// PATCH /api/v1/notifications/mark-all-read — Tümünü okundu yap
// Not: Bu route /:id'den ÖNCE tanımlanmalı
router.patch('/mark-all-read', authenticate, authorize('ADMIN'), markAllRead);

// PATCH /api/v1/notifications/:id — Bildirim güncelle
router.patch('/:id', authenticate, authorize('ADMIN'), updateNotification);

export default router;
