import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin';
import AdminAuth from '../models/AdminAuth';
import Staff from '../models/Staff';
import StaffAuth from '../models/StaffAuth';
import Lead from '../models/Lead';
import Student from '../models/Student';
import Attendance from '../models/Attendance';
import AuditLog from '../models/AuditLog';
import Batch from '../models/Batch';
import Class from '../models/Class';
import ClientAuth from '../models/ClientAuth';
import Counter from '../models/Counter';
import { Course } from '../models/Course';
import DeliveryLog from '../models/DeliveryLog';
import EvaluationReport from '../models/EvaluationReport';
import { Inquiry } from '../models/Inquiry';
import Notification from '../models/Notification';
import Package from '../models/Package';
import Payment from '../models/Payment';
import PaymentLink from '../models/PaymentLink';
import { Prodigy } from '../models/Prodigy';
import RefreshToken from '../models/RefreshToken';
import { Roadmap } from '../models/Roadmap';
import { SiteConfig } from '../models/SiteConfig';
import { Testimonial } from '../models/Testimonial';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids';

/**
 * Clears all documents from all collections EXCEPT admin credentials.
 * WARNING: This will delete ALL data except Admin and AdminAuth collections.
 */
const clearDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collections = await db.listCollections().toArray();
    const collectionsToSkip = ['admins', 'adminauths'];
    
    for (const collection of collections) {
      if (collectionsToSkip.includes(collection.name)) {
        console.log(`Skipping ${collection.name} (admin credentials preserved)`);
        continue;
      }
      const result = await db.collection(collection.name).deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${collection.name}`);
    }

    console.log('\nAll collections cleared successfully (admin credentials preserved)!');
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

clearDatabase();
