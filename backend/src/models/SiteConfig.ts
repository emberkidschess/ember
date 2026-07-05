import mongoose, { Schema } from 'mongoose';
import type { SiteConfigDocument } from '../types';

const SiteProfileSchema = new Schema({
  name: { type: String, required: true },
  fullName: { type: String, required: true },
  tagline: { type: String, required: true },
  description: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  phoneHref: { type: String, required: true },
  whatsappHref: { type: String, required: true },
  supportLine: { type: String, required: true },
});

const NavigationItemSchema = new Schema({
  name: { type: String, required: true },
  href: { type: String, required: true },
});

const CTASchema = new Schema({
  label: { type: String, required: true },
  href: { type: String, required: true },
});

const SocialLinkSchema = new Schema({
  name: { type: String, required: true },
  href: { type: String, required: true },
  type: { type: String, required: true, enum: ['whatsapp', 'instagram', 'facebook', 'mail'] },
  external: { type: Boolean, default: true },
});

const SiteConfigSchema = new Schema(
  {
    profile: { type: SiteProfileSchema, required: true },
    navigation: { type: [NavigationItemSchema], default: [] },
    primaryCta: { type: CTASchema, required: true },
    secondaryCta: { type: CTASchema, required: true },
    socialLinks: { type: [SocialLinkSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const SiteConfig = mongoose.model<SiteConfigDocument>('SiteConfig', SiteConfigSchema);
