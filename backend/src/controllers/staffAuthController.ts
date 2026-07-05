import { Request, Response } from 'express';
import { StaffAuthService } from '../services/staffAuthService';
import { PasswordResetService } from '../services/passwordResetService';
import StaffAuth from '../models/StaffAuth';
import { clearAuthCookies, refreshTokenFromRequest, setAuthCookies } from '../utils/authCookies';

export const staffLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const result = await StaffAuthService.login(email, password, ipAddress, userAgent);

    if (!result.success) {
      return res.status(401).json(result);
    }

    setAuthCookies(res, 'staff', result.data.accessToken, result.data.refreshToken);

    // Return user data without tokens in response body
    res.json({
      success: true,
      data: {
        user: result.data.user,
      },
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const staffRefreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = refreshTokenFromRequest(req, 'staff');
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!refreshToken) {
      clearAuthCookies(res, 'staff');
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const staffAuth = await StaffAuthService.verifyRefreshToken(refreshToken);

    if (!staffAuth) {
      clearAuthCookies(res, 'staff');
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    const consumed = await StaffAuthService.revokeToken(refreshToken);
    if (!consumed) {
      clearAuthCookies(res, 'staff');
      return res.status(401).json({
        success: false,
        error: 'Refresh token has already been used',
      });
    }
    const tokens = await StaffAuthService.generateTokens(staffAuth, ipAddress, userAgent);

    setAuthCookies(res, 'staff', tokens.accessToken, tokens.refreshToken);

    res.json({
      success: true,
      data: { expiresIn: tokens.expiresIn },
    });
  } catch (error) {
    console.error('Staff refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const staffLogout = async (req: Request, res: Response) => {
  try {
    const refreshToken = refreshTokenFromRequest(req, 'staff');

    if (refreshToken) {
      await StaffAuthService.revokeToken(refreshToken);
    }

    clearAuthCookies(res, 'staff');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Staff logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const staffForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    await PasswordResetService.requestReset(StaffAuth, 'staff', email);

    res.json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Staff forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const staffResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, token, and newPassword are required',
      });
    }

    const result = await PasswordResetService.confirmReset(StaffAuth, 'staff', email, token, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (error) {
    console.error('Staff reset password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
