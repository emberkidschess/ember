import mongoose, { Schema } from 'mongoose';
import type { RoadmapDocument } from '../types';

const RoadmapSchema = new Schema(
  {
    phase: { type: String, required: true },
    title: { type: String, required: true },
    rating: { type: String, required: true },
    outcome: { type: String, required: true },
    iconName: { type: String, required: true },
    color: { type: String, required: true },
    bg: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Roadmap = mongoose.model<RoadmapDocument>('Roadmap', RoadmapSchema);
