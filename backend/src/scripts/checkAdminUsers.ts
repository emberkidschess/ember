import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin';
import AdminAuth from '../models/AdminAuth';

dotenv.config();

/**
 * Lists all admin accounts (profile + auth status). Useful for verifying who
 * has admin access and whether any accounts are locked/inactive.
 */
async function checkAdminUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const admins = await Admin.find({}).lean();
    console.log(`\nAdmin profiles found: ${admins.length}`);

    for (const admin of admins) {
      const auth = await AdminAuth.findOne({ profileId: admin._id }).lean();
      console.log(
        `- ${admin.email} | ${admin.name} | role: ${admin.role} | auth status: ${
          auth ? auth.status : 'NO AUTH RECORD'
        }${auth?.lockUntil && auth.lockUntil > new Date() ? ' (LOCKED)' : ''}`
      );
    }

    if (admins.length === 0) {
      console.log('No admin profiles found. Run createAdmin.ts to bootstrap one.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdminUsers();
