import type { Document } from 'mongoose';

/**
 * Marketing-site content module types.
 *
 * This module (Course/Roadmap/Prodigy/Testimonial/SiteConfig/Inquiry) backs
 * the public marketing website's editable content - separate from the
 * academy operations domain (Lead/Student/Batch/Class/etc). It is read by
 * the public site and edited by admins via the CMS-style controllers in
 * controllers/*.ts.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ---- Course ----

export interface Course {
  level: string;
  title: string;
  subtitle: string;
  desc: string;
  topics: string[];
  accent: string;
  badgeColor: string;
  isPremium: boolean;
}

export interface CourseDocument extends Document, Course {
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Roadmap ----

export interface RoadmapPhase {
  phase: string;
  title: string;
  rating: string;
  outcome: string;
  iconName: string;
  color: string;
  bg: string;
}

export interface RoadmapDocument extends Document, RoadmapPhase {
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoursesResponse {
  courses: Course[];
  roadmap: RoadmapPhase[];
}

// ---- Prodigy ----

export interface ProdigySpotlight {
  name: string;
  age: string;
  title: string;
  image: string;
  story: string;
  achievements: string[];
}

export interface ProdigyCard {
  name: string;
  age: string;
  milestone: string;
  image: string;
  snippet: string;
}

export interface Prodigy {
  name: string;
  age: string;
  milestone: string;
  image: string;
  snippet: string;
  isSpotlight: boolean;
  story?: string;
  achievements?: string[];
}

export interface ProdigyDocument extends Document, Prodigy {
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProdigiesResponse {
  spotlight: ProdigySpotlight;
  prodigies: ProdigyCard[];
}

// ---- Testimonial ----

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  location?: string;
  // Field names match the marketing frontend's Testimonial type exactly -
  // imageUrl selects the ImageCard render path, videoUrl selects VideoCard,
  // instagramUrl selects Instagram embed card. Only one media type should be used.
  imageUrl?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  instagramUrl?: string;
}

export interface TestimonialDocument extends Document, Testimonial {
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonialsResponse {
  testimonials: Testimonial[];
}

// ---- SiteConfig ----

export interface SiteProfile {
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  phoneHref: string;
  whatsappHref: string;
  supportLine: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}

export interface CTA {
  label: string;
  href?: string;
}

export interface SocialLink {
  name: string;
  href: string;
  type: 'whatsapp' | 'instagram' | 'facebook' | 'mail';
  external: boolean;
}

export interface SiteConfigResponse {
  profile: SiteProfile;
  navigation: NavigationItem[];
  primaryCta: CTA;
  secondaryCta: CTA;
  socialLinks: SocialLink[];
}

export interface SiteConfigDocument extends Document, SiteConfigResponse {
  createdAt: Date;
  updatedAt: Date;
}

// ---- Inquiry ----

export interface Inquiry {
  name: string;
  email: string;
  phone: string;
  country: 'US' | 'CA' | 'IN' | 'SA' | 'AE' | 'QA' | 'KW' | 'BH' | 'OM';
  message: string;
  status: 'pending' | 'contacted' | 'resolved';
}

export interface InquiryDocument extends Document, Inquiry {
  createdAt: Date;
  updatedAt: Date;
}
