import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminAuth from '../models/AdminAuth';
import { AuthStatus } from '../models/BaseAuth';

dotenv.config();

/**
 * Unlocks an admin account that's been locked out by too many failed login
 * attempts. Set ADMIN_EMAIL in .env to the account you want to unlock.
 */
async function unlockAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.error('ADMIN_EMAIL must be set in .env');
      process.exit(1);
    }

    const adminAuth = await AdminAuth.findOne({ email: adminEmail.toLowerCase().trim() });

    if (!adminAuth) {
      console.log('Admin account not found:', adminEmail);
      process.exit(0);
    }

    adminAuth.failedLoginAttempts = 0;
    adminAuth.lockUntil = undefined;
    adminAuth.status = AuthStatus.ACTIVE;

    await adminAuth.save();

    console.log('Admin account unlocked successfully:');
    console.log('  Email:', adminAuth.email);
    console.log('  Status:', adminAuth.status);
    console.log('  Failed attempts:', adminAuth.failedLoginAttempts);

    process.exit(0);
  } catch (error) {
    console.error('Error unlocking admin account:', error);
    process.exit(1);
  }
}

unlockAdmin();
