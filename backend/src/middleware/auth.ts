import { Request, Response, NextFunction } from 'express';
import { BaseAuthService, TokenPayload as BaseTokenPayload } from '../services/baseAuthService';
import AdminAuth from '../models/AdminAuth';
import StaffAuth from '../models/StaffAuth';
import Admin from '../models/Admin';
import Staff from '../models/Staff';
import { accessTokenFromRequest } from '../utils/authCookies';

/**
 * Unified staff-side authentication middleware.
 *
 * This is the single source of truth for "internal" (admin/staff) authentication.
 * It replaces the old single-User-collection auth system. A request can come from
 * either an AdminAuth or a StaffAuth credential record; this middleware figures out
 * which one based on the JWT's `authType` claim, loads the matching profile
 * (Admin or Staff) to get the real-world role (super_admin/admin/coach/staff),
 * and exposes a consistent `req.user` shape so existing controllers don't need
 * to change.
 *
 * Client (student) authentication is handled separately by middleware/clientAuth.ts,
 * since students have a different permission model and shouldn't be able to hit
 * any route guarded by requireRole/requireAdmin/etc.
 */

export interface TokenPayload {
  userId: string;
  id: string;
  authId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  authType: 'admin' | 'staff';
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
  ipAddress?: string;
  userAgent?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = accessTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const payload: BaseTokenPayload = BaseAuthService.verifyAccessToken(token);

    if (payload.authType !== 'admin' && payload.authType !== 'staff') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint requires an admin or staff account',
      });
    }

    req.ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    req.userAgent = req.headers['user-agent'] || 'unknown';

    if (payload.authType === 'admin') {
      const adminAuth = await AdminAuth.findById(payload.authId);

      if (!adminAuth) {
        return res.status(401).json({ success: false, error: 'Account not found' });
      }
      if (adminAuth.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Account is not active' });
      }
      if (adminAuth.isLocked()) {
        return res.status(403).json({
          success: false,
          error: 'Account is locked due to multiple failed login attempts',
        });
      }

      const admin = await Admin.findById(adminAuth.profileId);
      if (!admin) {
        return res.status(401).json({ success: false, error: 'Admin profile not found' });
      }

      // Validate sessionVersion for global session revocation
      if (admin.sessionVersion !== payload.sessionVersion) {
        return res.status(401).json({
          success: false,
          error: 'Session has been revoked. Please login again.',
        });
      }

      req.user = {
        userId: admin._id.toString(),
        id: admin._id.toString(),
        authId: adminAuth._id.toString(),
        name: admin.name,
        email: adminAuth.email,
        role: admin.role,
        status: adminAuth.status,
        permissions: ['*'], // admins bypass granular permission checks entirely
        authType: 'admin',
      };

      return next();
    }

    // authType === 'staff'
    const staffAuth = await StaffAuth.findById(payload.authId);

    if (!staffAuth) {
      return res.status(401).json({ success: false, error: 'Account not found' });
    }
    if (staffAuth.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is not active' });
    }
    if (staffAuth.isLocked()) {
      return res.status(403).json({
        success: false,
        error: 'Account is locked due to multiple failed login attempts',
      });
    }

    const staff = await Staff.findById(staffAuth.profileId);
    if (!staff) {
      return res.status(401).json({ success: false, error: 'Staff profile not found' });
    }

    // Validate sessionVersion for global session revocation
    if (staff.sessionVersion !== payload.sessionVersion) {
      return res.status(401).json({
        success: false,
        error: 'Session has been revoked. Please login again.',
      });
    }

    req.user = {
      userId: staff._id.toString(),
      id: staff._id.toString(),
      authId: staffAuth._id.toString(),
      name: staff.name,
      email: staffAuth.email,
      role: staff.role,
      status: staffAuth.status,
      permissions: staff.permissions || [],
      authType: 'staff',
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Guards a route behind one or more granular staff permissions (see
 * constants/permissions.ts). Admins (req.user.permissions === ['*']) always
 * pass. Staff must have ALL of the listed permissions explicitly granted by
 * an admin via Staff.permissions.
 *
 * This is meant to be combined with requireStaffOrAdmin/requireCoachOrAdmin
 * (which gate broad access), not used as a replacement for them - a route
 * should still check role first, then specific permission.
 */
export const requirePermission = (...required: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const granted = req.user.permissions || [];

    if (granted.includes('*')) {
      return next();
    }

    const missing = required.filter((perm) => !granted.includes(perm));
    if (missing.length > 0) {
      return res.status(403).json({
        success: false,
        error: `Missing required permission(s): ${missing.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Guards a route behind at least one permission from a set. Use this for
 * read/list endpoints that support multiple workflows. Admins still bypass
 * granular checks via ['*'].
 */
export const requireAnyPermission = (...required: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const granted = req.user.permissions || [];

    if (granted.includes('*') || required.some((perm) => granted.includes(perm))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Requires one of these permissions: ${required.join(', ')}`,
    });
  };
};

export const requireSuperAdmin = requireRole('super_admin');

export const requireAdmin = requireRole('super_admin', 'admin');

export const requireCoachOrAdmin = requireRole('super_admin', 'admin', 'coach');

export const requireStaffOrAdmin = requireRole('super_admin', 'admin', 'coach', 'staff');
