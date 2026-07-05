import { Request, Response, NextFunction } from 'express';
import { BaseAuthService, TokenPayload } from '../services/baseAuthService';
import ClientAuth from '../models/ClientAuth';
import Student from '../models/Student';
import { accessTokenFromRequest } from '../utils/authCookies';

export interface ClientAuthRequest extends Request {
  client?: TokenPayload;
}

export const authenticateClient = async (req: ClientAuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = accessTokenFromRequest(req, 'client');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const payload = BaseAuthService.verifyAccessToken(token);

    if (payload.authType !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type',
      });
    }

    const clientAuth = await ClientAuth.findById(payload.authId);

    if (!clientAuth) {
      return res.status(401).json({
        success: false,
        error: 'Client not found',
      });
    }

    if (clientAuth.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is not active',
      });
    }

    if (clientAuth.isLocked()) {
      return res.status(403).json({
        success: false,
        error: 'Account is locked',
      });
    }

    const student = await Student.findById(clientAuth.profileId);
    if (!student) {
      return res.status(401).json({
        success: false,
        error: 'Student profile not found',
      });
    }
    if (student.studentStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Student account is not active',
      });
    }
    if (student.portalStatus === 'expired') {
      return res.status(403).json({
        success: false,
        error: 'Student portal access has expired. Please renew the package.',
      });
    }

    // Validate sessionVersion for global session revocation
    if (student.sessionVersion !== payload.sessionVersion) {
      return res.status(401).json({
        success: false,
        error: 'Session has been revoked. Please login again.',
      });
    }

    req.client = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};
