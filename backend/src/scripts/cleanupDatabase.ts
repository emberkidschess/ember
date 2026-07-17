import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import all models to ensure they're registered
import '../models/Admin';
import '../models/Staff';
import '../models/StaffAuth';
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
import '../models/Notification';
import '../models/DeliveryLog';
import '../models/AcademyEvent';
import '../models/EvaluationReport';
import '../models/Inquiry';
import '../models/Testimonial';
import '../models/Course';
import '../models/Prodigy';
import '../models/Roadmap';
import '../models/SiteConfig';
import '../models/RefreshToken';
import '../models/Counter';

const Admin = mongoose.model('Admin');
const Staff = mongoose.model('Staff');
const StaffAuth = mongoose.model('StaffAuth');
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
const Notification = mongoose.model('Notification');
const DeliveryLog = mongoose.model('DeliveryLog');
const AcademyEvent = mongoose.model('AcademyEvent');
const EvaluationReport = mongoose.model('EvaluationReport');
const Inquiry = mongoose.model('Inquiry');
const Testimonial = mongoose.model('Testimonial');
const Course = mongoose.model('Course');
const Prodigy = mongoose.model('Prodigy');
const Roadmap = mongoose.model('Roadmap');
const SiteConfig = mongoose.model('SiteConfig');
const RefreshToken = mongoose.model('RefreshToken');
const Counter = mongoose.model('Counter');

async function cleanupDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids');
    console.log('Connected to MongoDB');

    console.log('\n=== DATABASE CLEANUP STARTED ===\n');

    // Delete all collections (keeping Admin only)
    console.log('Deleting Students...');
    await Student.deleteMany({});
    console.log('✓ Students deleted');

    console.log('Deleting Staff...');
    await Staff.deleteMany({});
    console.log('✓ Staff deleted');

    // Staff profiles and their credentials must be cleared together.
    // Leaving StaffAuth records behind makes a previously used email appear
    // unavailable when a new staff member is created.
    console.log('Deleting Staff Auth...');
    await StaffAuth.deleteMany({});
    console.log('✓ Staff Auth deleted');

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

    console.log('Deleting Notifications...');
    await Notification.deleteMany({});
    console.log('✓ Notifications deleted');

    console.log('Deleting Delivery Logs...');
    await DeliveryLog.deleteMany({});
    console.log('✓ Delivery Logs deleted');

    console.log('Deleting Academy Events...');
    await AcademyEvent.deleteMany({});
    console.log('✓ Academy Events deleted');

    console.log('Deleting Evaluation Reports...');
    await EvaluationReport.deleteMany({});
    console.log('✓ Evaluation Reports deleted');

    console.log('Deleting Inquiries...');
    await Inquiry.deleteMany({});
    console.log('✓ Inquiries deleted');

    console.log('Deleting Testimonials...');
    await Testimonial.deleteMany({});
    console.log('✓ Testimonials deleted');

    console.log('Deleting Courses...');
    await Course.deleteMany({});
    console.log('✓ Courses deleted');

    console.log('Deleting Prodigy Games...');
    await Prodigy.deleteMany({});
    console.log('✓ Prodigy Games deleted');

    console.log('Deleting Roadmaps...');
    await Roadmap.deleteMany({});
    console.log('✓ Roadmaps deleted');

    console.log('Deleting Site Config...');
    await SiteConfig.deleteMany({});
    console.log('✓ Site Config deleted');

    console.log('Deleting Refresh Tokens...');
    await RefreshToken.deleteMany({});
    console.log('✓ Refresh Tokens deleted');

    console.log('Deleting Counters...');
    await Counter.deleteMany({});
    console.log('✓ Counters deleted');

    // Count preserved records
    const adminCount = await Admin.countDocuments();

    console.log('\n=== CLEANUP COMPLETED ===\n');
    console.log(`Preserved Admin accounts: ${adminCount}`);
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
