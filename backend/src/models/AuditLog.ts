import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  EXPORT = 'export',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  STAFF_CREATED = 'staff_created',
  STAFF_ACTIVATED = 'staff_activated',
  STAFF_DEACTIVATED = 'staff_deactivated',
  PERMISSION_DENIED = 'permission_denied',
  // Manual payment verification (the core trust boundary of the manual-only
  // payment flow - every "I confirm I received this money" click is logged
  // distinctly from a generic record update).
  PAYMENT_VERIFIED = 'payment_verified',
  PACKAGE_ACTIVATED = 'package_activated',
  // Portal freeze/pause lifecycle
  PORTAL_FROZEN = 'portal_frozen',
  PORTAL_UNFROZEN = 'portal_unfrozen',
  PORTAL_EXPIRED = 'portal_expired',
  // Attendance dispute/override lifecycle - distinct actions so a security
  // review can see exactly who changed a student's attendance record and
  // through which mechanism (dispute resolution vs direct override).
  ATTENDANCE_DISPUTE_RAISED = 'attendance_dispute_raised',
  ATTENDANCE_DISPUTE_RESOLVED = 'attendance_dispute_resolved',
  ATTENDANCE_OVERRIDDEN = 'attendance_overridden',
  // Trial conversion evaluation (Ready to Join / Not Ready)
  TRIAL_RESULT_MARKED = 'trial_result_marked',
}

export enum AuditEntityType {
  ADMIN = 'admin',
  STAFF = 'staff',
  STUDENT = 'student',
  LEAD = 'lead',
  COURSE = 'course',
  PRODIGY = 'prodigy',
  TESTIMONIAL = 'testimonial',
  INQUIRY = 'inquiry',
  SITE_CONFIG = 'site_config',
  ROADMAP = 'roadmap',
  PAYMENT = 'payment',
  ATTENDANCE = 'attendance',
  PACKAGE = 'package',
  PAYMENT_LINK = 'payment_link',
  CLASS = 'class',
  EVALUATION_REPORT = 'evaluation_report',
  BATCH = 'batch',
}

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  staffId?: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: mongoose.Types.ObjectId;
  entityName?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    entityType: {
      type: String,
      enum: Object.values(AuditEntityType),
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    entityName: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ staffId: 1, createdAt: -1 });
AuditLogSchema.index({ studentId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userRole: 1, action: 1 });

AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
