// Environment variables are provided by Render in production
import dotenv from 'dotenv';
dotenv.config();

import express, { Application } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import mongoose from 'mongoose';
import { validateEnv } from './config/env';
import { initializeRedis, closeRedis } from './config/redis';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { corsHandler } from './middleware/cors';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizer, xssProtection } from './middleware/sanitizer';
import { requestIdMiddleware } from './middleware/requestId';
import logger from './utils/logger';
import { initializeSchedulers, stopSchedulers } from './utils/scheduler';
import { BaseAuthService } from './services/baseAuthService';

const app: Application = express();
const PORT = process.env.PORT || 5001;

validateEnv();
app.set('trust proxy', 1);
app.disable('x-powered-by');

try {
  BaseAuthService.validateSecrets();
} catch (error) {
  logger.error('JWT secret validation failed:', error);
  process.exit(1);
}

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  })
);
app.use(requestIdMiddleware);
app.use(cookieParser());
app.use(corsHandler);
app.use(apiLimiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(xssProtection);
app.use(sanitizer);

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    await initializeRedis();
    initializeSchedulers();
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      stopSchedulers();
      
      // Set a timeout for graceful shutdown to prevent hanging
      const shutdownTimeout = 10000; // 10 seconds
      const shutdownTimer = setTimeout(() => {
        logger.warn('Graceful shutdown timeout reached. Forcing exit.');
        process.exit(1);
      }, shutdownTimeout);
      
      try {
        await closeRedis();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
      }
      
      try {
        await mongoose.connection.close();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection:', error);
      }
      
      clearTimeout(shutdownTimer);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
