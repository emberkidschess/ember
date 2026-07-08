import mongoose, { Schema, Document, Model } from 'mongoose';
import { COURSE_LEVELS } from '../domain/courseEnrollment';

export enum PackageStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  UPGRADED = 'upgraded',
  QUEUED = 'queued',
}

export interface IPackage extends Document {
  student: mongoose.Types.ObjectId;
  packageType: string;
  courseLevel: string;
  totalClasses: number;
  completedClasses: number;
  remainingClasses: number;
  regularClassesCompleted: number;
  renewalReminderSentAt?: Date;
  enrollmentDate: Date;
  status: PackageStatus;
  statusHistory?: Array<{
    status: PackageStatus;
    changedAt: Date;
  }>;
  previousPackageId?: mongoose.Types.ObjectId;
  nextPackageId?: mongoose.Types.ObjectId;
  activatedBy?: mongoose.Types.ObjectId;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PackageSchema: Schema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    packageType: {
      type: String,
      required: true,
      default: '10 Sessions',
    },
    courseLevel: {
      type: String,
      required: true,
      // Master remains readable for legacy records. New enrollment input is
      // validated against COURSE_LEVELS before it reaches this model.
      enum: [...COURSE_LEVELS, 'Master'],
    },
    totalClasses: {
      type: Number,
      required: true,
      default: 10,
    },
    completedClasses: {
      type: Number,
      required: true,
      default: 0,
    },
    remainingClasses: {
      type: Number,
      required: true,
      default: 10,
    },
    regularClassesCompleted: {
      type: Number,
      required: true,
      default: 0,
    },
    renewalReminderSentAt: {
      type: Date,
    },
    enrollmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(PackageStatus),
      default: PackageStatus.ACTIVE,
      required: true,
      index: true,
    },
    statusHistory: {
      type: [{
        status: {
          type: String,
          enum: Object.values(PackageStatus),
          required: true,
        },
        changedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      }],
      default: [],
    },
    previousPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
    },
    nextPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
    },
    activatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    activatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PackageSchema.index({ student: 1, status: 1 });
PackageSchema.index({ student: 1, createdAt: -1 });
PackageSchema.index({ status: 1, enrollmentDate: -1 });
PackageSchema.index({ courseLevel: 1, status: 1 });
PackageSchema.index({ status: 1, remainingClasses: 1 });
PackageSchema.index({ courseLevel: 1, totalClasses: 1, status: 1 });

PackageSchema.pre('save', function(next) {
  const modifiedPaths = this.modifiedPaths() as string[];
  const packageDoc = this as any;

  if (this.isNew && !packageDoc.statusHistory?.length) {
    packageDoc.statusHistory = [{ status: packageDoc.status, changedAt: new Date() }];
  } else if (modifiedPaths.includes('status')) {
    packageDoc.statusHistory = [
      ...(packageDoc.statusHistory || []),
      { status: packageDoc.status, changedAt: new Date() },
    ];
  }
  
  if (modifiedPaths.includes('regularClassesCompleted')) {
    (this as any).completedClasses = (this as any).regularClassesCompleted;
  }
  
  if (modifiedPaths.includes('regularClassesCompleted')) {
    (this as any).remainingClasses = Math.max(
      0,
      (this as any).totalClasses - (this as any).regularClassesCompleted
    );
  } else if (modifiedPaths.includes('completedClasses')) {
    (this as any).remainingClasses = Math.max(
      0,
      (this as any).totalClasses - (this as any).completedClasses
    );
  }
  
  next();
});

const Package: Model<IPackage> = mongoose.models.Package || mongoose.model<IPackage>('Package', PackageSchema);

export default Package;
