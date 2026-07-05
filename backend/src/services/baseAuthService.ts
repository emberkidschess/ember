import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken';
import logger from '../utils/logger';

export interface TokenPayload {
  authId: string;
  profileId: string;
  authType: 'admin' | 'staff' | 'client';
  sessionVersion?: number;
  jti?: string;
  iat?: number;
  exp?: number;
}

export class BaseAuthService {
  static validateSecrets(): void {
    const required = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'JWT_CLIENT_ACCESS_SECRET',
      'JWT_CLIENT_REFRESH_SECRET',
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`Missing JWT secret(s): ${missing.join(', ')}`);
    }
    const values = required.map((key) => process.env[key] as string);
    if (process.env.NODE_ENV === 'production' && values.some((value) => value.length < 32)) {
      throw new Error('Every JWT secret must be at least 32 characters in production');
    }
    if (new Set(values).size !== values.length) {
      throw new Error('JWT access and refresh secrets must all be different');
    }
  }

  private static accessSecret(authType: 'admin' | 'staff' | 'client'): string {
    if (authType === 'client') return process.env.JWT_CLIENT_ACCESS_SECRET!;
    return process.env.JWT_ACCESS_SECRET!;
  }

  private static refreshSecret(authType: 'admin' | 'staff' | 'client'): string {
    if (authType === 'client') return process.env.JWT_CLIENT_REFRESH_SECRET!;
    return process.env.JWT_REFRESH_SECRET!;
  }

  static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, BaseAuthService.accessSecret(payload.authType), {
      expiresIn: '15m',
      algorithm: 'HS256',
    } as jwt.SignOptions);
  }

  static generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, BaseAuthService.refreshSecret(payload.authType), {
      expiresIn: '30d',
      algorithm: 'HS256',
      jwtid: crypto.randomUUID(),
    } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.decode(token) as Partial<TokenPayload> | null;
    if (
      !decoded ||
      (decoded.authType !== 'admin' && decoded.authType !== 'staff' && decoded.authType !== 'client')
    ) {
      throw new Error('Invalid access token');
    }

    // Select the key from the untrusted type claim, then cryptographically
    // verify with that exact key. This prevents a client-signed token from
    // being accepted as an internal admin/staff token (or vice versa).
    return jwt.verify(token, BaseAuthService.accessSecret(decoded.authType), {
      algorithms: ['HS256'],
    }) as TokenPayload;
  }

  static verifyRefreshToken(token: string, authType: 'admin' | 'staff' | 'client'): TokenPayload {
    return jwt.verify(token, BaseAuthService.refreshSecret(authType), {
      algorithms: ['HS256'],
    }) as TokenPayload;
  }

  static async storeRefreshToken(
    authId: string,
    token: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await RefreshToken.create({
      userId: authId,
      token: tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ipAddress,
      userAgent,
      isRevoked: false,
    });
  }

  static async revokeRefreshToken(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const revokedToken = await RefreshToken.findOneAndUpdate(
      {
        token: tokenHash,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      },
      { isRevoked: true, revokedAt: new Date() }
    );
    return Boolean(revokedToken);
  }

  static async revokeAllUserTokens(authId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId: authId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );
  }

  static async findValidRefreshToken(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await RefreshToken.findOne({
      token: tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
    return !!record;
  }
}
