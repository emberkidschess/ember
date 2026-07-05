import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

export const errorHandler = (err: Error | AppError, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (err.name === 'MongoError' && (err as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  // Log error with status code and request ID
  const requestId = req.requestId || 'unknown';
  logger.error(`[${statusCode}] [${requestId}] ${message}`);
  if (err.stack) {
    logger.error('[Stack]', err.stack);
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';

  const response = {
    success: false,
    error: message,
    requestId,
    ...(isDevelopment && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
};
