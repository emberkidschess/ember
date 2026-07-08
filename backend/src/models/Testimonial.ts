import mongoose, { Schema } from 'mongoose';
import type { TestimonialDocument } from '../types';

const TestimonialSchema = new Schema(
  {
    quote: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String },
    // Photo of the parent/student giving the testimonial (Cloudinary URL,
    // via the existing fileUpload utility). Optional - a testimonial can be
    // text-only. Field name matches the marketing frontend's Testimonial
    // type exactly (imageUrl selects the ImageCard render path).
    imageUrl: { type: String },
    // Video testimonial support. `videoUrl` can be either a Cloudinary-
    // hosted upload (via fileUpload.ts, resource_type: 'video') or an
    // external embed - presence of videoUrl selects the VideoCard render
    // path on the frontend. `videoPosterUrl` is shown before playback.
    videoUrl: { type: String },
    videoPosterUrl: { type: String },
    // Instagram post/reel URL for embedded content. When present, renders
    // the Instagram embed card. Only one media type should be used per testimonial.
    instagramUrl: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

TestimonialSchema.index({ isActive: 1, order: 1 });

export const Testimonial = mongoose.model<TestimonialDocument>('Testimonial', TestimonialSchema);
