import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Notification Controller — Bildirim Yönetimi
 * Görev 5.3, 5.4: Koordinatör bildirim listesi, okundu/aksiyon işaretleme
 */

// ── 5.3: Bildirim Listesi ───────────────────────────────────

/**
 * GET /api/v1/notifications
 * Koordinatör bildirim listesi
 * Query: type (ISOLATION_RISK | LOST_CARD | SYSTEM), isRead (true|false), page, limit
 * Auth: ADMIN
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeParam = req.query.type as string | undefined;
    const isReadParam = req.query.isRead as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '20';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Filtre koşulları
    const where: any = {};

    if (typeParam && ['ISOLATION_RISK', 'LOST_CARD', 'SYSTEM'].includes(typeParam)) {
      where.type = typeParam;
    }

    if (isReadParam === 'true') {
      where.isRead = true;
    } else if (isReadParam === 'false') {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
    ]);

    // İlgili öğrenci bilgilerini çek
    const enrichedNotifications = await Promise.all(
      notifications.map(async (n) => {
        let studentName = null;
        if (n.studentProfileId) {
          const profile: any = await prisma.studentProfile.findUnique({
            where: { id: n.studentProfileId },
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          });
          if (profile) {
            studentName = `${profile.user.firstName} ${profile.user.lastName}`;
          }
        }
        return { ...n, studentName };
      })
    );

    res.json({
      success: true,
      data: {
        notifications: enrichedNotifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Okunmamış Bildirim Sayısı ───────────────────────────────

/**
 * GET /api/v1/notifications/unread-count
 * Okunmamış bildirim sayısı (Dashboard badge için)
 * Auth: ADMIN
 */
export const getUnreadCount = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({
      where: { isRead: false },
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

// ── 5.4: Bildirim Okundu/Aksiyon İşaretleme ────────────────

/**
 * PATCH /api/v1/notifications/:id
 * Bildirim okundu yap + aksiyon notu ekle
 * Body: { isRead?: boolean, actionTaken?: string }
 * Auth: ADMIN
 */
export const updateNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isRead, actionTaken } = req.body;

    // Bildirim var mı?
    const notification = await prisma.notification.findUnique({
      where: { id: id as string },
    });

    if (!notification) {
      throw new AppError('Bildirim bulunamadı.', 404);
    }

    const updateData: any = {};
    if (isRead !== undefined) {
      updateData.isRead = isRead;
      if (isRead) {
        updateData.readAt = new Date();
      } else {
        updateData.readAt = null;
      }
    }
    if (actionTaken !== undefined) {
      updateData.actionTaken = actionTaken;
    }

    const updated = await prisma.notification.update({
      where: { id: id as string },
      data: updateData,
    });

    logger.info(
      { notificationId: id, isRead, actionTaken },
      'Bildirim güncellendi'
    );

    res.json({
      success: true,
      message: 'Bildirim güncellendi.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ── Tümünü Okundu Yap ───────────────────────────────────────

/**
 * PATCH /api/v1/notifications/mark-all-read
 * Tüm okunmamış bildirimleri okundu yap
 * Auth: ADMIN
 */
export const markAllRead = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    logger.info({ updatedCount: result.count }, 'Tüm bildirimler okundu yapıldı');

    res.json({
      success: true,
      message: `${result.count} bildirim okundu olarak işaretlendi.`,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    next(error);
  }
};
