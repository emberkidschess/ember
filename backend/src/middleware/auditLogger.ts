import { Request, Response, NextFunction } from 'express';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { AuthRequest } from './auth';

interface AuditLogOptions {
  entityType: AuditEntityType;
  action: AuditAction;
  getResourceId: (req: Request) => string | undefined;
  getResourceName?: (req: Request) => string;
  getOldValue?: (req: Request) => Promise<any>;
  getNewValue?: (req: Request) => Promise<any>;
}

/**
 * Middleware for automatic audit logging
 * Captures who/what/when for data changes with oldValue/newValue diffs
 * 
 * Usage:
 * router.post('/students', auditLogger({
 *   entityType: AuditEntityType.STUDENT,
 *   action: AuditAction.CREATE,
 *   getResourceId: (req) => req.body.id,
 *   getResourceName: (req) => req.body.studentName
 * }), createStudent);
 */
export const auditLogger = (options: AuditLogOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Capture oldValue BEFORE calling next() - after next() the document may already be modified
    const oldValue = options.getOldValue ? await options.getOldValue(req).catch(() => undefined) : undefined;

    // Store original response.json to intercept the response
    const originalJson = res.json;
    let responseData: any;

    res.json = function (data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Continue to the next middleware/controller
    next();

    // After response is sent, log the audit entry
    res.on('finish', async () => {
      try {
        // Only log successful operations (2xx status codes)
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return;
        }

        const resourceId = options.getResourceId(req);
        if (!resourceId) {
          return;
        }

        const newValue = options.getNewValue ? await options.getNewValue(req).catch(() => undefined) : responseData?.data;

        let details: any = {};
        
        // If both old and new values exist, compute diff
        if (oldValue && newValue) {
          details = {
            oldValue,
            newValue,
            changes: computeChanges(oldValue, newValue)
          };
        } else if (newValue) {
          details = { newValue };
        } else if (oldValue) {
          details = { oldValue };
        }

        // Determine which ID field to use based on user role
        const userRole = req.user?.role || 'unknown';
        const auditData: any = {
          userEmail: req.user?.email,
          userName: req.user?.email || 'Unknown',
          userRole,
          action: options.action,
          entityType: options.entityType,
          entityId: resourceId,
          entityName: options.getResourceName?.(req) || `${options.entityType}`,
          details,
          ipAddress: req.ipAddress || req.ip || 'unknown',
          userAgent: req.userAgent || req.headers['user-agent'] || 'unknown',
          success: true,
          requestId: (req as any).requestId,
        };

        // Set appropriate ID field based on role
        if (userRole === 'admin') {
          auditData.adminId = req.user?.userId;
        } else if (userRole === 'staff') {
          auditData.staffId = req.user?.userId;
        } else if (userRole === 'student') {
          auditData.studentId = req.user?.userId;
        } else {
          auditData.userId = req.user?.userId;
        }

        await AuditLog.create(auditData);
      } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error - audit logging failure shouldn't break the main operation
      }
    });
  };
};

/**
 * Compute changes between old and new values
 * Returns a simplified diff showing only changed fields
 */
function computeChanges(oldValue: any, newValue: any): any {
  const changes: any = {};
  
  for (const key in newValue) {
    if (oldValue[key] !== newValue[key]) {
      changes[key] = {
        from: oldValue[key],
        to: newValue[key]
      };
    }
  }
  
  return changes;
}

/**
 * Helper to get old value from database before update
 */
export const getOldValue = (Model: any, idField: string = 'params.id') => {
  return async (req: Request): Promise<any> => {
    const id = (req as any)[idField] || req.params.id;
    if (!id) return undefined;
    
    try {
      const doc = await Model.findById(id);
      return doc ? doc.toObject() : undefined;
    } catch (error) {
      console.error('Failed to fetch old value for audit:', error);
      return undefined;
    }
  };
};

/**
 * Helper to get new value from request body or response
 */
export const getNewValueFromBody = () => {
  return async (req: Request): Promise<any> => {
    return req.body;
  };
};

/**
 * Helper to get new value from response data
 */
export const getNewValueFromResponse = () => {
  return async (req: Request): Promise<any> => {
    return undefined; // Will be set by the middleware from response
  };
};

/**
 * Helper to build audit log data with appropriate ID field based on user role
 * This replaces the deprecated userId field with role-specific fields (adminId, staffId, studentId)
 */
export const buildAuditLogData = (req: AuthRequest, additionalData: any = {}): any => {
  const userRole = req.user?.role || 'unknown';
  const auditData: any = {
    userEmail: req.user?.email,
    userName: req.user?.email || 'Unknown',
    userRole,
    ipAddress: req.ipAddress || req.ip || 'unknown',
    userAgent: req.userAgent || req.headers['user-agent'] || 'unknown',
    ...additionalData,
  };

  // Set appropriate ID field based on role - admin and super_admin both
  // belong to the Admin collection; coach and staff both belong to Staff.
  if (userRole === 'admin' || userRole === 'super_admin') {
    auditData.adminId = req.user?.userId;
  } else if (userRole === 'staff' || userRole === 'coach') {
    auditData.staffId = req.user?.userId;
  } else if (userRole === 'student') {
    auditData.studentId = req.user?.userId;
  } else {
    auditData.userId = req.user?.userId; // Fallback for unknown roles
  }

  return auditData;
};
