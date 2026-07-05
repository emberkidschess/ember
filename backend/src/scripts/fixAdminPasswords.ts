import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminAuth from '../models/AdminAuth';
import Admin from '../models/Admin';
import bcrypt from 'bcryptjs';

dotenv.config();

const fixAdminPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const adminEmails = process.env.ADMIN_EMAIL?.split(',') || [];
    const adminPasswords = process.env.ADMIN_PASSWORD?.split(',') || [];

    console.log(`Found ${adminEmails.length} admin credentials in .env`);

    for (let i = 0; i < adminEmails.length; i++) {
      const email = adminEmails[i].trim().toLowerCase();
      const plainPassword = adminPasswords[i]?.trim();

      if (!email || !plainPassword) {
        console.log(`⚠️  Skipping invalid credentials at index ${i}`);
        continue;
      }

      console.log(`\n🔄 Fixing password for: ${email}`);

      const admin = await Admin.findOne({ email });
      if (!admin) {
        console.log(`  ⚠️  Admin not found, skipping`);
        continue;
      }

      const adminAuth = await AdminAuth.findOne({ email });
      if (!adminAuth) {
        console.log(`  ⚠️  AdminAuth not found, skipping`);
        continue;
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);

      await AdminAuth.findByIdAndUpdate(adminAuth._id, {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockUntil: null,
        status: 'active',
      });

      console.log(`  ✅ Password reset successfully`);
    }

    console.log('\n✅ All admin passwords have been reset');
    console.log('You can now login with the credentials from your .env file');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Password reset failed:', error);
    process.exit(1);
  }
};

fixAdminPasswords();
