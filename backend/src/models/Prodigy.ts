import mongoose, { Schema } from 'mongoose';
import type { ProdigyDocument } from '../types';

const ProdigySchema = new Schema(
  {
    name: { type: String, required: true },
    age: { type: String, required: true },
    milestone: { type: String, required: true },
    image: { type: String, required: true },
    snippet: { type: String, required: true },
    isSpotlight: { type: Boolean, default: false },
    story: { type: String },
    achievements: { type: [String] },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Prodigy = mongoose.model<ProdigyDocument>('Prodigy', ProdigySchema);
