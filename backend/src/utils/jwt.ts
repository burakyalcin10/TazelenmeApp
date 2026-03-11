import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

/**
 * JWT Token Utility
 * Access token + Refresh token mekanizması
 */

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';
const ACCESS_TOKEN_EXPIRY: number = 86400; // 24 saat (saniye)
const REFRESH_TOKEN_EXPIRY: number = 604800; // 7 gün (saniye)

export interface TokenPayload {
  userId: string;
  tcNo: string;
  role: Role;
  profileId?: string; // StudentProfile ID (sadece STUDENT rolü için)
}

export interface DecodedToken extends JwtPayload, TokenPayload {}

/** Access token oluştur */
export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRY };
  return jwt.sign(payload, JWT_SECRET, options);
}

/** Refresh token oluştur */
export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRY };
  return jwt.sign(payload, JWT_SECRET, options);
}

/** Token doğrula ve decode et */
export function verifyToken(token: string): DecodedToken {
  return jwt.verify(token, JWT_SECRET) as DecodedToken;
}

/** Access + Refresh token çifti üret */
export function generateTokenPair(payload: TokenPayload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}
