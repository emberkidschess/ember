import mongoose, { Document, Model, Schema } from 'mongoose';
import { COURSE_LEVELS, CourseLevel } from '../domain/courseEnrollment';
import { SUPPORTED_TIMEZONES } from '../utils/dateTime';

export const EVENT_COUNTRIES = ['US', 'CA', 'IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM'] as const;
export type EventCountry = (typeof EVENT_COUNTRIES)[number];

export enum AcademyEventType {
  MASTERCLASS = 'masterclass',
  TOURNAMENT = 'tournament',
}

export enum AcademyEventStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface IAcademyEvent extends Document {
  type: AcademyEventType;
  name: string;
  country: EventCountry;
  timezone: (typeof SUPPORTED_TIMEZONES)[number];
  date: Date;
  startTime: string;
  durationMinutes: number;
  coach?: mongoose.Types.ObjectId;
  level?: CourseLevel;
  meetingLink: string;
  eligibleBatchIds: mongoose.Types.ObjectId[];
  status: AcademyEventStatus;
  cancelledAt?: Date;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AcademyEventSchema = new Schema<IAcademyEvent>(
  {
    type: {
      type: String,
      enum: Object.values(AcademyEventType),
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    country: { type: String, enum: EVENT_COUNTRIES, required: true, index: true },
    timezone: { type: String, enum: SUPPORTED_TIMEZONES, required: true, index: true },
    // Date-only values are stored at UTC midnight, like Class.date.
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    durationMinutes: { type: Number, required: true, min: 15, max: 480, default: 60 },
    coach: { type: Schema.Types.ObjectId, ref: 'Staff', index: true },
    level: { type: String, enum: COURSE_LEVELS, index: true },
    meetingLink: { type: String, required: true, trim: true },
    eligibleBatchIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
      required: true,
      validate: {
        validator: (ids: mongoose.Types.ObjectId[]) => ids.length > 0,
        message: 'At least one eligible running batch is required',
      },
    },
    status: {
      type: String,
      enum: Object.values(AcademyEventStatus),
      default: AcademyEventStatus.SCHEDULED,
      required: true,
      index: true,
    },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  },
  { timestamps: true }
);

AcademyEventSchema.index({ type: 1, date: 1, status: 1 });
AcademyEventSchema.index({ eligibleBatchIds: 1, date: 1, status: 1 });
AcademyEventSchema.index({ type: 1, country: 1, timezone: 1, level: 1, date: 1 });

const AcademyEvent: Model<IAcademyEvent> =
  mongoose.models.AcademyEvent || mongoose.model<IAcademyEvent>('AcademyEvent', AcademyEventSchema);

export default AcademyEvent;
