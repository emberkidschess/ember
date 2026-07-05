import { z } from 'zod';

/**
 * Zod schemas for the marketing-site content module (Course/Roadmap/
 * Prodigy/Testimonial/SiteConfig/Inquiry). Each mirrors its matching
 * mongoose schema field-for-field; controllers call .parse() on these
 * before writing to the database.
 */

export const courseSchema = z.object({
  level: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  desc: z.string().min(1),
  topics: z.array(z.string()).min(1),
  accent: z.string().min(1),
  badgeColor: z.string().min(1),
  isPremium: z.boolean().optional().default(false),
  order: z.number().optional().default(0),
});

export const roadmapSchema = z.object({
  phase: z.string().min(1),
  title: z.string().min(1),
  rating: z.string().min(1),
  outcome: z.string().min(1),
  iconName: z.string().min(1),
  color: z.string().min(1),
  bg: z.string().min(1),
  order: z.number().optional().default(0),
});

export const prodigySchema = z.object({
  name: z.string().min(1),
  age: z.string().min(1),
  milestone: z.string().min(1),
  image: z.string().min(1),
  snippet: z.string().min(1),
  isSpotlight: z.boolean().optional().default(false),
  story: z.string().optional(),
  achievements: z.array(z.string()).optional(),
  order: z.number().optional().default(0),
});

export const testimonialSchema = z.object({
  quote: z.string().min(1).max(1000),
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  location: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  videoPosterUrl: z.string().url().optional(),
  instagramUrl: z.string().url().regex(/instagram\.com\/(p|reel)\//, "Invalid Instagram URL format").optional(),
  isActive: z.boolean().optional().default(true),
  order: z.number().optional().default(0),
}).refine(
  (data) => {
    const mediaCount = [data.imageUrl, data.videoUrl, data.instagramUrl].filter(Boolean).length;
    return mediaCount <= 1;
  },
  { message: "Only one media type (imageUrl, videoUrl, or instagramUrl) is allowed per testimonial" }
);

const siteProfileSchema = z.object({
  name: z.string().min(1),
  fullName: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  phoneHref: z.string().min(1),
  whatsappHref: z.string().min(1),
  supportLine: z.string().min(1),
});

const navigationItemSchema = z.object({
  name: z.string().min(1),
  href: z.string().min(1),
});

const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const socialLinkSchema = z.object({
  name: z.string().min(1),
  href: z.string().min(1),
  type: z.enum(['whatsapp', 'instagram', 'facebook', 'mail']),
  external: z.boolean().optional().default(true),
});

export const siteConfigSchema = z.object({
  profile: siteProfileSchema,
  navigation: z.array(navigationItemSchema).optional().default([]),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema,
  socialLinks: z.array(socialLinkSchema).optional().default([]),
});

export const inquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  country: z.enum(['US', 'CA', 'IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM']),
  message: z.string().min(1),
  status: z.enum(['pending', 'contacted', 'resolved']).optional().default('pending'),
});
