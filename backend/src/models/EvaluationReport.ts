import mongoose, { Schema, Document, Model } from 'mongoose';
import { COURSE_LEVELS } from '../domain/courseEnrollment';

export interface IEvaluationReport extends Document {
  student: mongoose.Types.ObjectId;
  package: mongoose.Types.ObjectId;
  coach: mongoose.Types.ObjectId;
  title: string;
  strengths: string[];
  weaknesses: string[];
  tacticalSkills: number;
  openingKnowledge: number;
  endgameUnderstanding: number;
  coachNotes: string;
  recommendedNextLevel: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationReportSchema: Schema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'Report Card',
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    tacticalSkills: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    openingKnowledge: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    endgameUnderstanding: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    coachNotes: {
      type: String,
      trim: true,
    },
    recommendedNextLevel: {
      type: String,
      required: true,
      enum: [...COURSE_LEVELS, 'Master', 'Renew'],
    },
    // A report card is created as a draft (isPublished: false) so a coach
    // can fill it in and preview it before it becomes visible to the
    // student/parent. Publishing sets isPublished + publishedAt and
    // triggers the report_card_published notification.
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

EvaluationReportSchema.index({ student: 1, createdAt: -1 });
EvaluationReportSchema.index({ package: 1 });
EvaluationReportSchema.index({ coach: 1, createdAt: -1 });
EvaluationReportSchema.index({ recommendedNextLevel: 1 });

const EvaluationReport: Model<IEvaluationReport> = mongoose.models.EvaluationReport || mongoose.model<IEvaluationReport>('EvaluationReport', EvaluationReportSchema);

export default EvaluationReport;
