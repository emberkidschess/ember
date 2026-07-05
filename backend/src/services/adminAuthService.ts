import AdminAuth from '../models/AdminAuth';
import Admin from '../models/Admin';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { BaseAuthService } from './baseAuthService';
import logger from '../utils/logger';

export class AdminAuthService {
  static async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const adminAuth = await AdminAuth.findOne({ email: email.toLowerCase() });

    if (!adminAuth) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (adminAuth.isLocked()) {
      return { success: false, error: 'Account is locked due to multiple failed login attempts' };
    }

    if (adminAuth.status !== 'active') {
      return { success: false, error: 'Account is not active' };
    }

    const isValid = await adminAuth.comparePassword(password);
    if (!isValid) {
      await adminAuth.incrementLoginAttempts();
      await AuditLog.create({
        adminId: adminAuth._id,
        userEmail: adminAuth.email,
        userName: adminAuth.email,
        userRole: 'admin',
        action: AuditAction.LOGIN,
        entityType: AuditEntityType.ADMIN,
        entityId: adminAuth._id,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid password',
      });
      return { success: false, error: 'Invalid credentials' };
    }

    await adminAuth.resetLoginAttempts();

    const admin = await Admin.findById(adminAuth.profileId);
    if (!admin) {
      return { success: false, error: 'Admin profile not found' };
    }

    const tokens = await AdminAuthService.generateTokens(adminAuth, ipAddress, userAgent);

    await adminAuth.updateOne({ lastLogin: new Date(), lastLoginIP: ipAddress });

    await AuditLog.create({
      adminId: admin._id,
      userEmail: adminAuth.email,
      userName: admin.name,
      userRole: admin.role,
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.ADMIN,
      entityId: admin._id,
      ipAddress,
      userAgent,
      success: true,
    });

    return {
      success: true,
      data: {
        ...tokens,
        user: {
          id: admin._id,
          authId: adminAuth._id,
          name: admin.name,
          email: adminAuth.email,
          role: admin.role,
          status: adminAuth.status,
          permissions: ['*'],
          authType: 'admin',
        },
      },
    };
  }

  static async generateTokens(
    adminAuth: any,
    ipAddress: string,
    userAgent: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const admin = await Admin.findById(adminAuth.profileId).lean();
    const payload = {
      authId: adminAuth._id.toString(),
      profileId: adminAuth.profileId.toString(),
      authType: 'admin' as const,
      sessionVersion: (admin as any)?.sessionVersion || 1,
    };

    const accessToken = BaseAuthService.generateAccessToken(payload);
    const refreshToken = BaseAuthService.generateRefreshToken(payload);

    await BaseAuthService.storeRefreshToken(adminAuth._id.toString(), refreshToken, ipAddress, userAgent);

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  static async verifyRefreshToken(token: string): Promise<any | null> {
    const isValid = await BaseAuthService.findValidRefreshToken(token);
    if (!isValid) return null;

    try {
      const payload = BaseAuthService.verifyRefreshToken(token, 'admin');
      if (payload.authType !== 'admin') return null;

      const adminAuth = await AdminAuth.findById(payload.authId);
      if (!adminAuth || adminAuth.status !== 'active' || adminAuth.isLocked()) return null;

      const admin = await Admin.findById(adminAuth.profileId).select('sessionVersion');
      if (!admin || admin.sessionVersion !== payload.sessionVersion) return null;

      return adminAuth;
    } catch {
      return null;
    }
  }

  static async revokeToken(token: string): Promise<boolean> {
    return BaseAuthService.revokeRefreshToken(token);
  }

  static async revokeAllTokens(authId: string): Promise<void> {
    await BaseAuthService.revokeAllUserTokens(authId);
  }
}
