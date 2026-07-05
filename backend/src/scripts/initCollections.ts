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
 * Initializes all collections as empty collections in MongoDB.
 * This ensures all collections exist even if they have no documents.
 */
const initCollections = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const models = [
      Admin,
      AdminAuth,
      Staff,
      StaffAuth,
      Lead,
      Student,
      Attendance,
      AuditLog,
      Batch,
      Class,
      ClientAuth,
      Counter,
      Course,
      DeliveryLog,
      EvaluationReport,
      Inquiry,
      Notification,
      Package,
      Payment,
      PaymentLink,
      Prodigy,
      RefreshToken,
      Roadmap,
      SiteConfig,
      Testimonial,
    ];

    for (const model of models) {
      const collectionName = model.collection.name;
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      const exists = await db.listCollections({ name: collectionName }).hasNext();
      
      if (!exists) {
        await model.createCollection();
        console.log(`Created collection: ${collectionName}`);
      } else {
        console.log(`Collection already exists: ${collectionName}`);
      }
    }

    console.log('\nAll collections initialized successfully!');
  } catch (error) {
    console.error('Error initializing collections:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

initCollections();
