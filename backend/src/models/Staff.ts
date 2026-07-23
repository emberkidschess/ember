import mongoose, { Schema, Document, Model } from 'mongoose';

export enum StaffRole {
  COACH = 'coach',
  STAFF = 'staff',
}

export enum StaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface IStaff extends Document {
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  expertise: string[];
  salaryPerClass: number;
  /** Default link used for every batch class assigned to this staff member. */
  defaultClassLink?: string;
  permissions: string[];
  assignedStudents: mongoose.Types.ObjectId[];
  assignedClasses: mongoose.Types.ObjectId[];
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdBy?: mongoose.Types.ObjectId;
  // Security fields for persistence-based lockout
  failedAttempts?: number;
  lastFailedAt?: Date;
  isLocked?: boolean;
  lockedUntil?: Date;
  // Session management for global revocation
  sessionVersion?: number;
  dailyScheduleLastSentKey?: string;
  // Audit trail references
  auditLogs?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: Object.values(StaffRole),
    default: StaffRole.COACH,
  },
  status: {
    type: String,
    enum: Object.values(StaffStatus),
    default: StaffStatus.ACTIVE,
  },
  expertise: [{
    type: String,
  }],
  salaryPerClass: {
    type: Number,
    default: 0,
  },
  defaultClassLink: {
    type: String,
    trim: true,
  },
  permissions: {
    type: [String],
    default: [],
  },
  assignedStudents: [{
    type: Schema.Types.ObjectId,
    ref: 'Student',
  }],
  assignedClasses: [{
    type: Schema.Types.ObjectId,
    ref: 'Class',
  }],
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
  },
  // Security fields for persistence-based lockout
  failedAttempts: {
    type: Number,
    default: 0,
  },
  lastFailedAt: {
    type: Date,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockedUntil: {
    type: Date,
  },
  // Session management for global revocation
  sessionVersion: {
    type: Number,
    default: 1,
  },
  dailyScheduleLastSentKey: {
    type: String,
  },
  // Audit trail references
  auditLogs: [{
    type: Schema.Types.ObjectId,
    ref: 'AuditLog',
  }],
}, {
  timestamps: true,
});

StaffSchema.index({ email: 1 });
StaffSchema.index({ role: 1 });
StaffSchema.index({ status: 1 });

const Staff: Model<IStaff> = mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);

export default Staff;
