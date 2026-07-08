import mongoose, { Schema } from 'mongoose';
import type { CourseDocument } from '../types';

const CourseSchema = new Schema(
  {
    level: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    desc: { type: String, required: true },
    topics: { type: [String], required: true },
    accent: { type: String, required: true },
    badgeColor: { type: String, required: true },
    isPremium: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

CourseSchema.index({ order: 1 });
CourseSchema.index({ isPremium: 1, order: 1 });

export const Course = mongoose.model<CourseDocument>('Course', CourseSchema);
