import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

export const sanitizer = mongoSanitize();

export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    const sanitizeString = (str: string): string => {
      return str
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    };

    const sensitiveTextFields = new Set(['password', 'newPassword', 'confirmPassword']);

    const sanitizeObject = (obj: unknown, fieldName?: string): unknown => {
      if (typeof obj === 'string') {
        // Passwords are opaque secrets, not renderable content. Mutating them
        // can silently make a valid password impossible to reproduce.
        if (fieldName && sensitiveTextFields.has(fieldName)) return obj;
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map((value) => sanitizeObject(value, fieldName));
      }
      if (obj !== null && typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key], key);
          }
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body);
  }
  next();
};
