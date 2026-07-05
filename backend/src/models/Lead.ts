import mongoose, { Schema, Document, Model } from 'mongoose';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  TRIAL_SCHEDULED = 'trial_scheduled',
  READY_TO_JOIN = 'ready_to_join',
  NOT_READY = 'not_ready',
  CONVERTED = 'converted',
  LOST = 'lost',
  FOLLOW_UP = 'follow_up',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISEMENT = 'advertisement',
  EVENT = 'event',
  WORD_OF_MOUTH = 'word_of_mouth',
  OTHER = 'other',
}

export enum LeadCategory {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  COMPETITIVE = 'competitive',
  HOBBYIST = 'hobbyist',
}

export interface ILead extends Document {
  studentName: string;
  parentName: string;
  phoneNumber: string;
  country?: 'US' | 'CA' | 'IN' | 'SA' | 'AE' | 'QA' | 'KW' | 'BH' | 'OM';
  email: string;
  courseInterest: string;
  leadSource: LeadSource;
  leadCategory: LeadCategory;
  status: LeadStatus;
  notes?: string;
  assignedTo?: mongoose.Types.ObjectId;
  convertedToStudent?: boolean;
  studentId?: mongoose.Types.ObjectId;
  followUpDate?: Date;
  lastContactDate?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
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
      lowercase: true,
      trim: true,
    },
    courseInterest: {
      type: String,
      required: true,
      trim: true,
    },
    leadSource: {
      type: String,
      enum: Object.values(LeadSource),
      default: LeadSource.WEBSITE,
      required: true,
    },
    leadCategory: {
      type: String,
      enum: Object.values(LeadCategory),
      default: LeadCategory.BEGINNER,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    convertedToStudent: {
      type: Boolean,
      default: false,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    followUpDate: {
      type: Date,
    },
    lastContactDate: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
  },
  {
    timestamps: true,
  }
);

LeadSchema.index({ status: 1, createdAt: -1 });
LeadSchema.index({ leadSource: 1, createdAt: -1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ phoneNumber: 1 });
LeadSchema.index({ createdAt: -1 });

const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

export default Lead;
