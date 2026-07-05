import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin, { AdminRole } from '../models/Admin';
import AdminAuth from '../models/AdminAuth';
import { AuthStatus } from '../models/BaseAuth';

dotenv.config();

/**
 * Bootstraps the first super-admin account. Run this once when setting up a
 * new environment (it's safe to re-run - it exits early if the email already
 * has an account).
 *
 * Required env vars: MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD
 */
async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
      process.exit(1);
    }

    if (adminPassword.length < 8) {
      console.error('ADMIN_PASSWORD must be at least 8 characters');
      process.exit(1);
    }

    const normalizedEmail = adminEmail.toLowerCase().trim();

    const existingAuth = await AdminAuth.findOne({ email: normalizedEmail });
    if (existingAuth) {
      console.log('An admin account already exists for this email:', normalizedEmail);
      process.exit(0);
    }

    const adminProfile = await Admin.create({
      name: 'Super Admin',
      email: normalizedEmail,
      role: AdminRole.SUPER_ADMIN,
      permissions: [],
    });

    // Note: password is plaintext here on purpose - BaseAuthSchema's
    // pre('save') hook hashes it automatically before it's written to MongoDB.
    const adminAuth = await AdminAuth.create({
      email: normalizedEmail,
      password: adminPassword,
      status: AuthStatus.ACTIVE,
      profileId: adminProfile._id,
    });

    console.log('Super admin created successfully:');
    console.log('  Email:', adminAuth.email);
    console.log('  Role:', adminProfile.role);
    console.log('  Status:', adminAuth.status);
    console.log('\nYou can now log in at POST /auth/admin/login with this email and the password from ADMIN_PASSWORD.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
