import ClientAuth from '../models/ClientAuth';
import Student from '../models/Student';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { BaseAuthService } from './baseAuthService';
import logger from '../utils/logger';

export class ClientAuthService {
  static async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const clientAuth = await ClientAuth.findOne({ email: email.toLowerCase() });

    if (!clientAuth) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (clientAuth.status === 'pending_activation') {
      return { success: false, error: 'Account not yet activated. Please complete payment to activate.' };
    }

    if (clientAuth.status !== 'active') {
      return { success: false, error: 'Account is not active' };
    }

    if (clientAuth.isLocked()) {
      return { success: false, error: 'Account is locked due to multiple failed login attempts' };
    }

    const isValid = await clientAuth.comparePassword(password);
    if (!isValid) {
      await clientAuth.incrementLoginAttempts();
      return { success: false, error: 'Invalid credentials' };
    }

    await clientAuth.resetLoginAttempts();

    const student = await Student.findById(clientAuth.profileId).select(
      'studentName parentName email studentStatus portalStatus sessionVersion'
    );
    if (!student) {
      return { success: false, error: 'Student profile not found' };
    }
    if (student.studentStatus !== 'active') {
      return { success: false, error: 'Student account is not active' };
    }
    if (student.portalStatus === 'expired') {
      return { success: false, error: 'Student portal access has expired. Please renew the package.' };
    }

    const tokens = await ClientAuthService.generateTokens(clientAuth, ipAddress, userAgent);
    await clientAuth.updateOne({ lastLogin: new Date(), lastLoginIP: ipAddress });

    await AuditLog.create({
      studentId: student._id,
      userEmail: clientAuth.email,
      userName: (student as any).studentName,
      userRole: 'student',
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.STUDENT,
      entityId: student._id,
      ipAddress,
      userAgent,
      success: true,
    });

    return {
      success: true,
      data: {
        ...tokens,
        user: {
          id: student._id,
          authId: clientAuth._id,
          name: (student as any).studentName,
          email: clientAuth.email,
          role: 'student',
          status: clientAuth.status,
          authType: 'client',
        },
      },
    };
  }

  static async generateTokens(
    clientAuth: any,
    ipAddress: string,
    userAgent: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const student = await Student.findById(clientAuth.profileId).lean();
    if (!student) {
      throw new Error('Student profile not found');
    }

    const payload = {
      authId: clientAuth._id.toString(),
      profileId: clientAuth.profileId.toString(),
      authType: 'client' as const,
      sessionVersion: (student as any).sessionVersion || 1,
    };

    const accessToken = BaseAuthService.generateAccessToken(payload);
    const refreshToken = BaseAuthService.generateRefreshToken(payload);

    await BaseAuthService.storeRefreshToken(clientAuth._id.toString(), refreshToken, ipAddress, userAgent);

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  static async verifyRefreshToken(token: string): Promise<any | null> {
    const isValid = await BaseAuthService.findValidRefreshToken(token);
    if (!isValid) return null;

    try {
      const payload = BaseAuthService.verifyRefreshToken(token, 'client');
      if (payload.authType !== 'client') return null;

      const clientAuth = await ClientAuth.findById(payload.authId);
      if (!clientAuth || clientAuth.status !== 'active' || clientAuth.isLocked()) return null;

      const student = await Student.findById(clientAuth.profileId).select(
        'studentStatus portalStatus sessionVersion'
      );
      if (
        !student ||
        student.studentStatus !== 'active' ||
        student.portalStatus === 'expired' ||
        student.sessionVersion !== payload.sessionVersion
      ) {
        return null;
      }

      return clientAuth;
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
