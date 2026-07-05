import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import all models to ensure they're registered
import '../models/Admin';
import '../models/Staff';
import '../models/Student';
import '../models/Lead';
import '../models/Package';
import '../models/Payment';
import '../models/PaymentLink';
import '../models/Class';
import '../models/Batch';
import '../models/ClientAuth';
import '../models/AuditLog';
import '../models/Attendance';

const Admin = mongoose.model('Admin');
const Staff = mongoose.model('Staff');
const Student = mongoose.model('Student');
const Lead = mongoose.model('Lead');
const Package = mongoose.model('Package');
const Payment = mongoose.model('Payment');
const PaymentLink = mongoose.model('PaymentLink');
const Class = mongoose.model('Class');
const Batch = mongoose.model('Batch');
const ClientAuth = mongoose.model('ClientAuth');
const AuditLog = mongoose.model('AuditLog');
const Attendance = mongoose.model('Attendance');

async function cleanupDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids');
    console.log('Connected to MongoDB');

    console.log('\n=== DATABASE CLEANUP STARTED ===\n');

    // Delete collections (keeping Admin and Staff)
    console.log('Deleting Students...');
    await Student.deleteMany({});
    console.log('✓ Students deleted');

    console.log('Deleting Leads...');
    await Lead.deleteMany({});
    console.log('✓ Leads deleted');

    console.log('Deleting Packages...');
    await Package.deleteMany({});
    console.log('✓ Packages deleted');

    console.log('Deleting Payments...');
    await Payment.deleteMany({});
    console.log('✓ Payments deleted');

    console.log('Deleting Payment Links...');
    await PaymentLink.deleteMany({});
    console.log('✓ Payment Links deleted');

    console.log('Deleting Classes...');
    await Class.deleteMany({});
    console.log('✓ Classes deleted');

    console.log('Deleting Batches...');
    await Batch.deleteMany({});
    console.log('✓ Batches deleted');

    console.log('Deleting Client Auth...');
    await ClientAuth.deleteMany({});
    console.log('✓ Client Auth deleted');

    console.log('Deleting Audit Logs...');
    await AuditLog.deleteMany({});
    console.log('✓ Audit Logs deleted');

    console.log('Deleting Attendance Records...');
    await Attendance.deleteMany({});
    console.log('✓ Attendance Records deleted');

    // Count preserved records
    const adminCount = await Admin.countDocuments();
    const staffCount = await Staff.countDocuments();

    console.log('\n=== CLEANUP COMPLETED ===\n');
    console.log(`Preserved Admin accounts: ${adminCount}`);
    console.log(`Preserved Staff accounts: ${staffCount}`);
    console.log('\nAll other data has been deleted.\n');

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupDatabase().then(() => {
  console.log('Database cleanup script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
