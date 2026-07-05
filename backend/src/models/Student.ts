import mongoose, { Schema, Document, Model } from 'mongoose';
import { SUPPORTED_TIMEZONES } from '../utils/dateTime';

export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  GRADUATED = 'graduated',
  SUSPENDED = 'suspended',
}

export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  DROPPED = 'dropped',
}

/**
 * Portal access state, independent of ClientAuth.status (which governs
 * whether the login credential itself works at all).
 *
 *   ACTIVE  - normal operation, counts toward batch attendance, package
 *             countdown progresses normally.
 *   FROZEN  - staff/admin paused the account (e.g. exam leave). Package
 *             countdown halts, student is excluded from active batch class
 *             generation, but they can still log in and view history.
 *   EXPIRED - 7 days passed after batch-completion warning with no renewal
 *             payment. Portal login is blocked by the expiry check; only
 *             a new payment + reactivation restores ACTIVE.
 */
export enum PortalStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  EXPIRED = 'expired',
}

export interface IStudent extends Document {
  studentName: string;
  parentName: string;
  phoneNumber: string;
  country?: 'US' | 'CA' | 'IN' | 'SA' | 'AE' | 'QA' | 'KW' | 'BH' | 'OM';
  email: string;
  address?: string;
  dateOfBirth?: Date;
  course: string;
  enrollmentStatus: EnrollmentStatus;
  studentStatus: StudentStatus;
  enrollmentDate: Date;
  completionDate?: Date;
  assignedStaff?: mongoose.Types.ObjectId;
  notes?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  leadId?: mongoose.Types.ObjectId;
  currentPackageId?: mongoose.Types.ObjectId;
  currentBatchId?: mongoose.Types.ObjectId;
  packageHistory: mongoose.Types.ObjectId[];
  whatsappCommunityLink?: string;
  timezone: string;
  createdBy?: mongoose.Types.ObjectId;
  // Portal expiry tracking for renewal/retention
  portalExpiryDate?: Date;
  // Freeze/pause and expiry state - see PortalStatus enum above
  portalStatus: PortalStatus;
  frozenAt?: Date;
  frozenBy?: mongoose.Types.ObjectId;
  frozenReason?: string;
  unfrozenAt?: Date;
  unfrozenBy?: mongoose.Types.ObjectId;
  expiredAt?: Date;
  // Session management for global revocation
  sessionVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    parentName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      enum: ['US', 'CA', 'IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
    enrollmentStatus: {
      type: String,
      enum: Object.values(EnrollmentStatus),
      default: EnrollmentStatus.PENDING,
      required: true,
    },
    studentStatus: {
      type: String,
      enum: Object.values(StudentStatus),
      default: StudentStatus.ACTIVE,
      required: true,
    },
    enrollmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completionDate: {
      type: Date,
    },
    assignedStaff: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    notes: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      relationship: {
        type: String,
        trim: true,
      },
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
    },
    currentPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      index: true,
    },
    currentBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      index: true,
    },
    packageHistory: {
      type: [Schema.Types.ObjectId],
      ref: 'Package',
      default: [],
    },
    whatsappCommunityLink: {
      type: String,
    },
    timezone: {
      type: String,
      required: true,
      default: 'America/New_York',
      enum: SUPPORTED_TIMEZONES,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    // Portal expiry tracking for renewal/retention
    portalExpiryDate: {
      type: Date,
      index: true,
    },
    portalStatus: {
      type: String,
      enum: Object.values(PortalStatus),
      default: PortalStatus.ACTIVE,
      required: true,
      index: true,
    },
    frozenAt: { type: Date },
    frozenBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    frozenReason: { type: String, trim: true },
    unfrozenAt: { type: Date },
    unfrozenBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    expiredAt: { type: Date },
    // Session management for global revocation
    sessionVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

StudentSchema.index({ studentStatus: 1, enrollmentDate: -1 });
StudentSchema.index({ enrollmentStatus: 1, enrollmentDate: -1 });
StudentSchema.index({ assignedStaff: 1 });
StudentSchema.index({ phoneNumber: 1 });
StudentSchema.index({ course: 1 });
StudentSchema.index({ createdAt: -1 });
StudentSchema.index({ portalStatus: 1, currentBatchId: 1 });

const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export default Student;
