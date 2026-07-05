import StaffAuth from '../models/StaffAuth';
import Staff from '../models/Staff';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { BaseAuthService } from './baseAuthService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

export class StaffAuthService {
  static async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const staffAuth = await StaffAuth.findOne({ email: email.toLowerCase() });

    if (!staffAuth) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (staffAuth.isLocked()) {
      return { success: false, error: 'Account is locked due to multiple failed login attempts' };
    }

    if (staffAuth.status !== 'active') {
      return { success: false, error: 'Account is not active' };
    }

    const isValid = await staffAuth.comparePassword(password);
    if (!isValid) {
      await staffAuth.incrementLoginAttempts();
      return { success: false, error: 'Invalid credentials' };
    }

    await staffAuth.resetLoginAttempts();

    const staff = await Staff.findById(staffAuth.profileId);
    if (!staff) {
      return { success: false, error: 'Staff profile not found' };
    }

    const tokens = await StaffAuthService.generateTokens(staffAuth, ipAddress, userAgent);
    await staffAuth.updateOne({ lastLogin: new Date(), lastLoginIP: ipAddress });

    await AuditLog.create({
      staffId: staff._id,
      userEmail: staffAuth.email,
      userName: staff.name,
      userRole: staff.role,
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.STAFF,
      entityId: staff._id,
      ipAddress,
      userAgent,
      success: true,
    });

    return {
      success: true,
      data: {
        ...tokens,
        user: {
          id: staff._id,
          authId: staffAuth._id,
          name: staff.name,
          email: staffAuth.email,
          role: staff.role,
          status: staffAuth.status,
          permissions: staff.permissions || [],
          authType: 'staff',
        },
      },
    };
  }

  static async generateTokens(
    staffAuth: any,
    ipAddress: string,
    userAgent: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const staff = await Staff.findById(staffAuth.profileId).lean();
    const payload = {
      authId: staffAuth._id.toString(),
      profileId: staffAuth.profileId.toString(),
      authType: 'staff' as const,
      sessionVersion: (staff as any)?.sessionVersion || 1,
    };

    const accessToken = BaseAuthService.generateAccessToken(payload);
    const refreshToken = BaseAuthService.generateRefreshToken(payload);

    await BaseAuthService.storeRefreshToken(staffAuth._id.toString(), refreshToken, ipAddress, userAgent);

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  static async verifyRefreshToken(token: string): Promise<any | null> {
    const isValid = await BaseAuthService.findValidRefreshToken(token);
    if (!isValid) return null;

    try {
      const payload = BaseAuthService.verifyRefreshToken(token, 'staff');
      if (payload.authType !== 'staff') return null;

      const staffAuth = await StaffAuth.findById(payload.authId);
      if (!staffAuth || staffAuth.status !== 'active' || staffAuth.isLocked()) return null;

      const staff = await Staff.findById(staffAuth.profileId).select('sessionVersion');
      if (!staff || staff.sessionVersion !== payload.sessionVersion) return null;

      return staffAuth;
    } catch {
      return null;
    }
  }

  /** Create StaffAuth credentials for a new staff member */
  static async createCredentials(
    staffId: string,
    email: string
  ): Promise<{ tempPassword: string }> {
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    await StaffAuth.create({
      email: email.toLowerCase(),
      password: tempPassword,
      status: 'active',
      profileId: staffId,
    });

    return { tempPassword };
  }

  /** Reset staff password, returning new temp password */
  static async resetPassword(staffAuthId: string): Promise<string> {
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await StaffAuth.findByIdAndUpdate(staffAuthId, {
      password: hashedPassword,
      failedLoginAttempts: 0,
      $unset: { lockUntil: 1 },
    });

    return tempPassword;
  }

  static async revokeToken(token: string): Promise<boolean> {
    return BaseAuthService.revokeRefreshToken(token);
  }

  static async revokeAllTokens(authId: string): Promise<void> {
    await BaseAuthService.revokeAllUserTokens(authId);
  }
}
