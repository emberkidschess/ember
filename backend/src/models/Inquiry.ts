import mongoose, { Schema } from 'mongoose';
import type { InquiryDocument } from '../types';

const InquirySchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    country: { type: String, enum: ['US', 'CA', 'IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM'], required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'contacted', 'resolved'], default: 'pending' },
  },
  {
    timestamps: true,
  }
);

export const Inquiry = mongoose.model<InquiryDocument>('Inquiry', InquirySchema);
