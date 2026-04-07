import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Card Controller — RFID Kart Yönetimi
 * Kart atama, iptal/pasif yapma, listeleme
 */

// ── 3.4: Kart Atama ────────────────────────────────────────

/**
 * POST /api/v1/cards
 * Öğrenciye yeni kart atama
 * Body: { uid: string, studentId: string }
 * Auth: ADMIN
 */
export const assignCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid, studentId } = req.body;

    if (!uid || !studentId) {
      throw new AppError('uid ve studentId zorunludur.', 400);
    }

    // Kart UID zaten kullanılıyor mu?
    const existingCard = await prisma.rfidCard.findUnique({
      where: { uid },
    });

    if (existingCard) {
      throw new AppError('Bu kart UID zaten sistemde kayıtlı.', 409);
    }

    // Öğrenci profili var mı?
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, id: true } },
        rfidCards: { where: { status: 'ACTIVE' } },
      },
    });

    if (!studentProfile) {
      throw new AppError('Öğrenci profili bulunamadı.', 404);
    }

    // Öğrencinin zaten aktif bir kartı var mı? (bilgi amaçlı uyarı)
    if (studentProfile.rfidCards.length > 0) {
      logger.warn(
        {
          studentId,
          existingCards: studentProfile.rfidCards.map((c) => c.uid),
        },
        'Öğrencinin zaten aktif kartı var — yeni kart atanıyor'
      );
    }

    // Yeni kart oluştur
    const card = await prisma.rfidCard.create({
      data: {
        uid,
        studentId,
        status: 'ACTIVE',
      },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'ASSIGN_CARD',
          entity: 'RfidCard',
          entityId: card.id,
          details: JSON.stringify({
            uid,
            studentId,
            studentName: `${studentProfile.user.firstName} ${studentProfile.user.lastName}`,
          }),
        },
      });
    }

    logger.info(
      {
        cardId: card.id,
        uid,
        studentName: `${studentProfile.user.firstName} ${studentProfile.user.lastName}`,
      },
      'Yeni kart atandı'
    );

    res.status(201).json({
      success: true,
      message: `Kart başarıyla atandı: ${uid} → ${studentProfile.user.firstName} ${studentProfile.user.lastName}`,
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

// ── 3.5: Kart Durumu Güncelleme ─────────────────────────────

/**
 * PATCH /api/v1/cards/:id/status
 * Kart durumunu güncelle (LOST, REVOKED, ACTIVE)
 * Body: { status: CardStatus }
 * Auth: ADMIN
 */
export const updateCardStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      throw new AppError('status zorunludur.', 400);
    }

    const validStatuses = ['ACTIVE', 'LOST', 'REVOKED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Geçersiz kart durumu. Geçerli değerler: ${validStatuses.join(', ')}`, 400);
    }

    // Kart var mı?
    const card: any = await prisma.rfidCard.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!card) {
      throw new AppError('Kart bulunamadı.', 404);
    }

    // Durumu güncelle
    const updatedCard = await prisma.rfidCard.update({
      where: { id },
      data: {
        status,
        revokedAt: status === 'LOST' || status === 'REVOKED' ? new Date() : null,
      },
    });

    // LOST/REVOKED yapıldıysa bildirim oluştur
    if (status === 'LOST' || status === 'REVOKED') {
      await prisma.notification.create({
        data: {
          type: 'LOST_CARD',
          title: status === 'LOST' ? 'Kart Kayıp Bildirildi' : 'Kart İptal Edildi',
          message: `${card.student.user.firstName} ${card.student.user.lastName} adlı öğrencinin kartı (${card.uid}) ${status === 'LOST' ? 'kayıp' : 'iptal'} olarak işaretlendi.`,
          studentProfileId: card.studentId,
        },
      });
    }

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'UPDATE_CARD_STATUS',
          entity: 'RfidCard',
          entityId: card.id,
          details: JSON.stringify({
            uid: card.uid,
            oldStatus: card.status,
            newStatus: status,
            studentName: `${card.student.user.firstName} ${card.student.user.lastName}`,
          }),
        },
      });
    }

    logger.info(
      { cardId: id, uid: card.uid, oldStatus: card.status, newStatus: status },
      'Kart durumu güncellendi'
    );

    res.json({
      success: true,
      message: `Kart durumu güncellendi: ${card.uid} → ${status}`,
      data: updatedCard,
    });
  } catch (error) {
    next(error);
  }
};

// ── Kart Listeleme ──────────────────────────────────────────

/**
 * GET /api/v1/cards
 * Tüm kartları listele (filtreleme ile)
 * Query: status, page, limit
 * Auth: ADMIN
 */
export const listCards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusParam = req.query.status as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '20';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (statusParam && ['ACTIVE', 'LOST', 'REVOKED'].includes(statusParam)) {
      where.status = statusParam;
    }

    const [cards, total] = await Promise.all([
      prisma.rfidCard.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.rfidCard.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        cards,
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

// ── Öğrencinin Kartları ─────────────────────────────────────

/**
 * GET /api/v1/cards/student/:studentId
 * Belirli öğrencinin tüm kartları (aktif + geçmiş)
 * Auth: ADMIN
 */
export const getStudentCards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;

    const studentProfile: any = await prisma.studentProfile.findUnique({
      where: { id: studentId as string },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!studentProfile) {
      throw new AppError('Öğrenci profili bulunamadı.', 404);
    }

    const cards = await prisma.rfidCard.findMany({
      where: { studentId: studentId as string },
      orderBy: { assignedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        student: {
          id: studentProfile.id,
          firstName: studentProfile.user.firstName,
          lastName: studentProfile.user.lastName,
        },
        cards,
      },
    });
  } catch (error) {
    next(error);
  }
};
