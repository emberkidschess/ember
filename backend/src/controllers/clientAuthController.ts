import { Request, Response } from 'express';
import { ClientAuthService } from '../services/clientAuthService';
import { PasswordResetService } from '../services/passwordResetService';
import ClientAuth from '../models/ClientAuth';
import Student from '../models/Student';
import { clearAuthCookies, refreshTokenFromRequest, setAuthCookies } from '../utils/authCookies';

export const clientLogin = async (req: Request, res: Response) => {
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

    const result = await ClientAuthService.login(email, password, ipAddress, userAgent);

    if (!result.success) {
      return res.status(401).json(result);
    }

    setAuthCookies(res, 'client', result.data.accessToken, result.data.refreshToken);
    res.json({
      success: true,
      data: {
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresIn: result.data.expiresIn,
        user: result.data.user,
      },
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const clientRefreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = refreshTokenFromRequest(req, 'client');
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!refreshToken) {
      clearAuthCookies(res, 'client');
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const clientAuth = await ClientAuthService.verifyRefreshToken(refreshToken);

    if (!clientAuth) {
      clearAuthCookies(res, 'client');
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    const consumed = await ClientAuthService.revokeToken(refreshToken);
    if (!consumed) {
      clearAuthCookies(res, 'client');
      return res.status(401).json({
        success: false,
        error: 'Refresh token has already been used',
      });
    }
    const tokens = await ClientAuthService.generateTokens(clientAuth, ipAddress, userAgent);
    const student = await Student.findById(clientAuth.profileId);
    setAuthCookies(res, 'client', tokens.accessToken, tokens.refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: student ? {
          id: student._id,
          authId: clientAuth._id,
          name: student.studentName,
          email: clientAuth.email,
          role: 'student',
          status: clientAuth.status,
          authType: 'client',
        } : undefined,
      },
    });
  } catch (error) {
    console.error('Client refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const clientLogout = async (req: Request, res: Response) => {
  try {
    const refreshToken = refreshTokenFromRequest(req, 'client');

    if (refreshToken) {
      await ClientAuthService.revokeToken(refreshToken);
    }

    clearAuthCookies(res, 'client');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Client logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const clientForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    await PasswordResetService.requestReset(ClientAuth, 'client', email);

    res.json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Client forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const clientResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, token, and newPassword are required',
      });
    }

    const result = await PasswordResetService.confirmReset(ClientAuth, 'client', email, token, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (error) {
    console.error('Client reset password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
