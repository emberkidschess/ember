import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Admin, { AdminRole } from '../models/Admin';
import AdminAuth from '../models/AdminAuth';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import StaffAuth from '../models/StaffAuth';
import { AuthStatus } from '../models/BaseAuth';
import Lead, { LeadStatus, LeadSource, LeadCategory } from '../models/Lead';
import Student, { StudentStatus, EnrollmentStatus } from '../models/Student';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids';

/**
 * Seeds a development database with sample data: one admin, one staff/coach,
 * a handful of leads, and a couple of enrolled students. This is for local
 * development only - it wipes existing data in these collections, so never
 * point it at a production database.
 *
 * Generates random strong passwords rather than committing hardcoded ones to
 * source control, and prints them once so you can log in locally.
 */
const generateDevPassword = () => crypto.randomBytes(9).toString('base64url');

const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run the seed script with NODE_ENV=production.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      Admin.deleteMany({}),
      AdminAuth.deleteMany({}),
      Staff.deleteMany({}),
      StaffAuth.deleteMany({}),
      Lead.deleteMany({}),
      Student.deleteMany({}),
    ]);
    console.log('Cleared existing admin/staff/lead/student data');

    const adminPassword = generateDevPassword();
    const adminProfile = await Admin.create({
      name: 'Admin User',
      email: 'admin@emberkids.com',
      role: AdminRole.SUPER_ADMIN,
      permissions: [],
    });
    await AdminAuth.create({
      email: 'admin@emberkids.com',
      password: adminPassword,
      status: AuthStatus.ACTIVE,
      profileId: adminProfile._id,
    });
    console.log('Created admin user: admin@emberkids.com');

    const staffPassword = generateDevPassword();
    const staffProfile = await Staff.create({
      name: 'Staff User',
      email: 'staff@emberkids.com',
      role: StaffRole.COACH,
      status: StaffStatus.ACTIVE,
      expertise: ['Beginner Chess', 'Intermediate Chess'],
      salaryPerClass: 0,
      defaultClassLink: 'https://meet.google.com/emberkids-demo',
    });
    await StaffAuth.create({
      email: 'staff@emberkids.com',
      password: staffPassword,
      status: AuthStatus.ACTIVE,
      profileId: staffProfile._id,
    });
    console.log('Created staff/coach user: staff@emberkids.com');

    const leads = await Lead.create([
      {
        studentName: 'John Smith',
        parentName: 'Jane Smith',
        phoneNumber: '555-0101',
        email: 'john.smith@example.com',
        courseInterest: 'Beginner Chess',
        leadSource: LeadSource.WEBSITE,
        leadCategory: LeadCategory.BEGINNER,
        status: LeadStatus.NEW,
        createdBy: staffProfile._id,
      },
      {
        studentName: 'Emily Johnson',
        parentName: 'Michael Johnson',
        phoneNumber: '555-0102',
        email: 'emily.j@example.com',
        courseInterest: 'Intermediate Chess',
        leadSource: LeadSource.REFERRAL,
        leadCategory: LeadCategory.INTERMEDIATE,
        status: LeadStatus.CONTACTED,
        createdBy: staffProfile._id,
      },
      {
        studentName: 'David Williams',
        parentName: 'Sarah Williams',
        phoneNumber: '555-0103',
        email: 'david.w@example.com',
        courseInterest: 'Advanced Chess',
        leadSource: LeadSource.SOCIAL_MEDIA,
        leadCategory: LeadCategory.ADVANCED,
        status: LeadStatus.QUALIFIED,
        createdBy: staffProfile._id,
      },
    ]);
    console.log(`Created ${leads.length} sample leads`);

    const students = await Student.create([
      {
        studentName: 'Alice Brown',
        parentName: 'Robert Brown',
        phoneNumber: '555-0201',
        email: 'alice.b@example.com',
        course: 'Beginner Chess',
        enrollmentStatus: EnrollmentStatus.ENROLLED,
        studentStatus: StudentStatus.ACTIVE,
        enrollmentDate: new Date(),
        createdBy: staffProfile._id,
      },
      {
        studentName: 'Bob Davis',
        parentName: 'Lisa Davis',
        phoneNumber: '555-0202',
        email: 'bob.d@example.com',
        course: 'Intermediate Chess',
        enrollmentStatus: EnrollmentStatus.ENROLLED,
        studentStatus: StudentStatus.ACTIVE,
        enrollmentDate: new Date(),
        createdBy: staffProfile._id,
      },
    ]);
    console.log(`Created ${students.length} sample students (no login credentials - use the admin panel's "activate package" flow to create their student logins)`);

    console.log('\nDatabase seeded successfully!\n');
    console.log('Login credentials (save these now, they will not be shown again):');
    console.log(`  Admin: admin@emberkids.com / ${adminPassword}`);
    console.log(`  Staff: staff@emberkids.com / ${staffPassword}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedDatabase();
