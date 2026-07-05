import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  COURSE_LEVELS,
  CourseLevel,
  ensureBatchSessionPlan,
} from '../domain/courseEnrollment';

export enum BatchStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export interface IBatch extends Document {
  name: string;
  courseLevel: CourseLevel;
  coach: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  status: BatchStatus;
  schedule?: string;
  timezone?: string;
  startDate?: Date;
  completedAt?: Date;
  notes?: string;
  whatsappCommunityLink?: string;
  totalSessions: number;
  sessionsCompleted: number;
  sessions: {
    sessionNumber: number;
    status: 'planned' | 'scheduled' | 'completed';
    classId?: mongoose.Types.ObjectId;
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    courseLevel: {
      type: String,
      // Master remains readable until legacy data is migrated to Expert.
      enum: [...COURSE_LEVELS, 'Master'],
      required: true,
      index: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    students: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BatchStatus),
      default: BatchStatus.UPCOMING,
      required: true,
      index: true,
    },
    schedule: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    startDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    whatsappCommunityLink: {
      type: String,
      trim: true,
    },
    totalSessions: {
      type: Number,
      required: true,
    },
    sessionsCompleted: {
      type: Number,
      default: 0,
      required: true,
    },
    sessions: {
      type: [
        {
          sessionNumber: { type: Number, required: true },
          status: {
            type: String,
            enum: ['planned', 'scheduled', 'completed'],
            default: 'planned',
            required: true,
          },
          classId: { type: Schema.Types.ObjectId, ref: 'Class' },
        },
      ],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

BatchSchema.index({ courseLevel: 1, name: 1 }, { unique: true });
BatchSchema.index({ status: 1, courseLevel: 1 });
BatchSchema.index({ coach: 1, status: 1 });

BatchSchema.pre('validate', function(next) {
  const batch = this as any;
  if (COURSE_LEVELS.includes(batch.courseLevel) || batch.courseLevel === 'Master') {
    ensureBatchSessionPlan(batch);
  }
  next();
});

BatchSchema.pre('save', function(next) {
  const batch = this as any;
  if (this.isModified('sessions') || this.isModified('sessionsCompleted')) {
    batch.sessionsCompleted = Array.isArray(batch.sessions)
      ? batch.sessions.filter((session: { status: string }) => session.status === 'completed').length
      : batch.sessionsCompleted;

    if (batch.sessionsCompleted >= batch.totalSessions && batch.status === BatchStatus.ONGOING) {
      batch.status = BatchStatus.COMPLETED;
      batch.completedAt = new Date();
    }
  }
  next();
});

const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);

export default Batch;
