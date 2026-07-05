import { Request, Response } from 'express';
import { AdminAuthService } from '../services/adminAuthService';
import { PasswordResetService } from '../services/passwordResetService';
import Admin from '../models/Admin';
import AdminAuth from '../models/AdminAuth';
import { clearAuthCookies, refreshTokenFromRequest, setAuthCookies } from '../utils/authCookies';

export const adminLogin = async (req: Request, res: Response) => {
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

    const result = await AdminAuthService.login(email, password, ipAddress, userAgent);

    if (!result.success) {
      return res.status(401).json(result);
    }

    setAuthCookies(res, 'admin', result.data.accessToken, result.data.refreshToken);

    // Return user data without tokens in response body
    res.json({
      success: true,
      data: {
        user: result.data.user,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const adminRefreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = refreshTokenFromRequest(req, 'admin');
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!refreshToken) {
      clearAuthCookies(res, 'admin');
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const adminAuth = await AdminAuthService.verifyRefreshToken(refreshToken);

    if (!adminAuth) {
      clearAuthCookies(res, 'admin');
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    const consumed = await AdminAuthService.revokeToken(refreshToken);
    if (!consumed) {
      clearAuthCookies(res, 'admin');
      return res.status(401).json({
        success: false,
        error: 'Refresh token has already been used',
      });
    }
    const tokens = await AdminAuthService.generateTokens(adminAuth, ipAddress, userAgent);
    const admin = await Admin.findById(adminAuth.profileId);

    setAuthCookies(res, 'admin', tokens.accessToken, tokens.refreshToken);

    res.json({
      success: true,
      data: {
        user: {
          id: admin?._id,
          authId: adminAuth._id,
          name: admin?.name,
          email: adminAuth.email,
          role: admin?.role,
          status: adminAuth.status,
          authType: 'admin',
        },
      },
    });
  } catch (error) {
    console.error('Admin refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const adminLogout = async (req: Request, res: Response) => {
  try {
    const refreshToken = refreshTokenFromRequest(req, 'admin');

    if (refreshToken) {
      await AdminAuthService.revokeToken(refreshToken);
    }

    clearAuthCookies(res, 'admin');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const adminForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    await PasswordResetService.requestReset(AdminAuth, 'admin', email);

    // Always the same response, regardless of whether the account exists.
    res.json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, token, and newPassword are required',
      });
    }

    const result = await PasswordResetService.confirmReset(AdminAuth, 'admin', email, token, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
