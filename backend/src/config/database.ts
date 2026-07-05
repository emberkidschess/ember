import mongoose from 'mongoose';
import logger from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // `var` is required for a mergeable global declaration used by hot reload.
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };

    // Implement exponential backoff retry mechanism
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second
    let retryCount = 0;

    cached.promise = (async () => {
      while (retryCount < maxRetries) {
        try {
          await mongoose.connect(MONGODB_URI!, opts);
          logger.info('MongoDB connected successfully');
          return mongoose;
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            logger.error(`MongoDB connection failed after ${maxRetries} attempts:`, error);
            throw error;
          }
          
          const delay = baseDelay * Math.pow(2, retryCount - 1);
          logger.warn(`MongoDB connection attempt ${retryCount} failed. Retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error('Max retries reached for MongoDB connection');
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    logger.error('MongoDB connection failed:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;
