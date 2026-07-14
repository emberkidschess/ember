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
  automationEnabled: boolean;
  frequencyDays?: number[];
  classStartTime?: string;
  classDurationMinutes?: number;
  meetingLink?: string;
  accessOpensMinutesBefore?: number;
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
    automationEnabled: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    frequencyDays: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (days: number[] | undefined) =>
          days === undefined ||
          (days.length > 0 && days.length <= 7 && new Set(days).size === days.length &&
            days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
        message: 'Frequency days must contain unique weekday numbers from 0 to 6',
      },
    },
    classStartTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    classDurationMinutes: {
      type: Number,
      min: 15,
      max: 480,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    accessOpensMinutesBefore: {
      type: Number,
      min: 5,
      max: 10,
      default: 10,
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
BatchSchema.index({ status: 1, completedAt: -1 });
BatchSchema.index({ automationEnabled: 1, status: 1, startDate: 1 });
BatchSchema.index({ createdAt: -1 });

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
