import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { verifyPin, hashPin, generatePin } from '../utils/pin';
import { generateTokenPair, verifyToken, TokenPayload } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Auth Controller — Giriş, Çıkış, Token Yenileme
 */

/** POST /api/v1/auth/login — TC + PIN ile giriş */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tcNo, pin } = req.body;

    if (!tcNo || !pin) {
      throw new AppError('TC Kimlik No ve PIN zorunludur.', 400);
    }

    // TC ile kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { tcNo },
      include: { studentProfile: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('TC Kimlik No veya PIN hatalı.', 401);
    }

    // PIN doğrula
    const isValid = await verifyPin(user.pinHash, pin);
    if (!isValid) {
      throw new AppError('TC Kimlik No veya PIN hatalı.', 401);
    }

    // Token payload
    const payload: TokenPayload = {
      userId: user.id,
      tcNo: user.tcNo,
      role: user.role,
      profileId: user.studentProfile?.id,
    };

    // Token çifti üret
    const tokens = generateTokenPair(payload);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] }),
      },
    });

    logger.info({ userId: user.id, role: user.role }, 'Kullanıcı giriş yaptı');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/v1/auth/refresh — Refresh token ile yeni access token al */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token zorunludur.', 400);
    }

    // Refresh token doğrula
    const decoded = verifyToken(refreshToken);

    // Kullanıcı hâlâ aktif mi kontrol et
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { studentProfile: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Kullanıcı bulunamadı veya hesap devre dışı.', 401);
    }

    // Yeni token çifti üret
    const payload: TokenPayload = {
      userId: user.id,
      tcNo: user.tcNo,
      role: user.role,
      profileId: user.studentProfile?.id,
    };

    const tokens = generateTokenPair(payload);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/v1/auth/logout — Çıkış (client-side token silme) */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'LOGOUT',
          entity: 'User',
          entityId: req.user.userId,
        },
      });

      logger.info({ userId: req.user.userId }, 'Kullanıcı çıkış yaptı');
    }

    res.json({
      success: true,
      message: 'Başarıyla çıkış yapıldı.',
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/v1/auth/me — Mevcut kullanıcı bilgisi */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Kimlik doğrulanmadı.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        email: true,
        studentProfile: {
          select: {
            id: true,
            isAtRisk: true,
            healthConditions: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
