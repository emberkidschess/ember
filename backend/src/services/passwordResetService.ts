import crypto from 'crypto';
import logger from '../utils/logger';
import { BaseAuthService } from './baseAuthService';
import { primaryFrontendUrl } from '../utils/frontendUrl';

export class PasswordResetService {
  static async requestReset(AuthModel: any, authType: string, email: string): Promise<void> {
    const auth = await AuthModel.findOne({ email: email.toLowerCase() }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!auth) {
      // Always return without error to prevent account enumeration
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await AuthModel.findByIdAndUpdate(auth._id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: expires,
    });

    // Build reset URL
    const frontendUrl = primaryFrontendUrl();
    const resetPath =
      authType === 'client'
        ? '/student/reset-password'
        : authType === 'staff'
          ? '/staff/reset-password'
          : '/admin/reset-password';
    const resetUrl = `${frontendUrl}${resetPath}?token=${rawToken}&email=${encodeURIComponent(email)}`;

    try {
      const emailService = (await import('./emailService')).default;
      await emailService.sendTemplatedEmail(email, 'password_reset', {
        email,
        resetUrl,
        expiresIn: '1 hour',
      });
    } catch (err) {
      logger.error('Failed to send password reset email:', err);
    }
  }

  static async confirmReset(
    AuthModel: any,
    _authType: string,
    email: string,
    rawToken: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const auth = await AuthModel.findOne({
      email: email.toLowerCase(),
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!auth) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    if (
      !auth.passwordResetTokenHash ||
      !crypto.timingSafeEqual(
        Buffer.from(auth.passwordResetTokenHash, 'hex'),
        Buffer.from(tokenHash, 'hex')
      )
    ) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    if (!auth.passwordResetExpires || auth.passwordResetExpires < new Date()) {
      return { success: false, error: 'Reset token has expired' };
    }

    auth.password = newPassword;
    auth.passwordResetTokenHash = undefined;
    auth.passwordResetExpires = undefined;
    auth.failedLoginAttempts = 0;
    auth.lockUntil = undefined;
    await auth.save();
    await BaseAuthService.revokeAllUserTokens(auth._id.toString());

    if (_authType === 'admin') {
      const Admin = (await import('../models/Admin')).default;
      await Admin.findByIdAndUpdate(auth.profileId, { $inc: { sessionVersion: 1 } });
    } else if (_authType === 'staff') {
      const Staff = (await import('../models/Staff')).default;
      await Staff.findByIdAndUpdate(auth.profileId, { $inc: { sessionVersion: 1 } });
    } else {
      const Student = (await import('../models/Student')).default;
      await Student.findByIdAndUpdate(auth.profileId, { $inc: { sessionVersion: 1 } });
    }

    return { success: true };
  }
}
