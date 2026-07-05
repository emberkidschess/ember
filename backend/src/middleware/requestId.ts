import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const supplied = req.headers['x-request-id'];
  const requestId =
    typeof supplied === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
      ? supplied
      : uuidv4();
  req.requestId = requestId;
  
  // Add request ID to response headers for client correlation
  res.setHeader('X-Request-ID', requestId);
  
  next();
};
