import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyToken, DecodedToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

/**
 * Auth Middleware — JWT doğrulama ve rol bazlı yetkilendirme
 */

// Express Request'e user bilgisi ekle
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/** JWT token doğrulama middleware */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Yetkilendirme başarısız. Token bulunamadı.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Oturumunuz süresi dolmuş. Lütfen tekrar giriş yapın.', 401);
    }
    throw new AppError('Geçersiz token.', 401);
  }
};

/** Rol bazlı yetkilendirme — sadece belirtilen roller erişebilir */
export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Kimlik doğrulanmadı.', 401);
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.userId, role: req.user.role, requiredRoles: roles },
        'Yetkisiz erişim denemesi'
      );
      throw new AppError('Bu işlem için yetkiniz bulunmamaktadır.', 403);
    }

    next();
  };
};

/** IoT cihaz kimlik doğrulama — API Key kontrolü */
export const authenticateDevice = (req: Request, _res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.IOT_API_KEY;

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    logger.warn(
      { ip: req.ip, deviceLocation: req.body?.deviceLocation },
      'Yetkisiz IoT cihaz erişim denemesi'
    );
    throw new AppError('Geçersiz API anahtarı. Cihaz doğrulanamadı.', 403);
  }

  next();
};
