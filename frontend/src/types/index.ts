// ============================================
// CORE TYPE DEFINITIONS
// ============================================

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
  href: string;
}

export interface SocialLink {
  name: string;
  href: string;
  type: "whatsapp" | "instagram" | "facebook" | "mail";
  external: boolean;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface HeroProps {
  onOpenTrial: () => void;
}

export interface CtaProps {
  title: string | React.ReactNode;
  description?: string;
  buttonText: string;
  buttonHref: string;
  onButtonClick?: () => void;
  className?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  location?: string;
  /** Image URL for background (Cloudinary or public path) */
  imageUrl?: string;
  /** Video URL for video testimonial */
  videoUrl?: string;
  /** Poster frame shown before the video plays */
  videoPosterUrl?: string;
  /** Instagram post/reel URL for embedded content */
  instagramUrl?: string;
}

export interface Advantage {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}

export interface Program {
  level: string;
  skill: string;
  title: string;
  text: string;
  topics: string[];
  tone: string;
}

export interface ClassFlowStep {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  text: string;
}

export interface AdmissionStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface StudentSpotlight {
  name: string;
  age: string;
  title: string;
  image: string;
  story: string;
  achievements: string[];
}

export interface Prodigy {
  name: string;
  age: string;
  milestone: string;
  image: string;
  snippet: string;
}

export interface Course {
  level: string;
  title: string;
  subtitle: string;
  desc: string;
  topics: string[];
  accent: string;
  badgeColor: string;
  isPremium?: boolean;
}

export interface RoadmapMilestone {
  phase: string;
  title: string;
  rating: string;
  outcome: string;
  icon: React.ComponentType<{ className?: string }> | string;
  color: string;
  bg: string;
}

export type RoadmapIconName = "Compass" | "Shield" | "Zap" | "Crown";

export interface RoadmapMilestoneDTO {
  phase: string;
  title: string;
  rating: string;
  outcome: string;
  iconName: RoadmapIconName;
  color: string;
  bg: string;
}

export interface ContactItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  info: string;
}

export interface StatItem {
  num: number | string;
  suffix?: string;
  label: string;
  textClass?: string;
}

export interface BookFreeTrialProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TrialFormData {
  name: string;
  email: string;
  phone: string;
  country: 'US' | 'CA' | 'IN' | 'SA' | 'AE' | 'QA' | 'KW' | 'BH' | 'OM';
  childAge: string;
  preferredDate: string;
  preferredTime: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SiteConfigResponse {
  profile: SiteProfile;
  navigation: NavigationItem[];
  primaryCta: CTA;
  secondaryCta: CTA;
  socialLinks: SocialLink[];
}

export interface TestimonialsResponse {
  testimonials: Testimonial[];
}

export interface ProgramsResponse {
  programs: Program[];
}

export interface ProdigiesResponse {
  spotlight: StudentSpotlight;
  prodigies: Prodigy[];
}

export interface CoursesResponse {
  courses: Course[];
  roadmap: RoadmapMilestoneDTO[];
}

export interface StatsResponse {
  students: number;
  achievements: number;
  countries: number;
  mentorshipRatio: string;
}

// ============================================
// MONGODB DOCUMENT TYPES
// ============================================

export interface SiteConfigDocument {
  _id?: string;
  profile: SiteProfile;
  navigation: NavigationItem[];
  primaryCta: CTA;
  secondaryCta: CTA;
  socialLinks: SocialLink[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonialDocument {
  _id?: string;
  quote: string;
  name: string;
  role: string;
  location: string;
  image?: string;
  rating?: number;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgramDocument {
  _id?: string;
  level: string;
  skill: string;
  title: string;
  text: string;
  topics: string[];
  tone: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProdigyDocument {
  _id?: string;
  name: string;
  age: string;
  milestone: string;
  image: string;
  snippet: string;
  isSpotlight: boolean;
  story?: string;
  achievements?: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseDocument {
  _id?: string;
  level: string;
  title: string;
  subtitle: string;
  desc: string;
  topics: string[];
  accent: string;
  badgeColor: string;
  isPremium: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoadmapDocument {
  _id?: string;
  phase: string;
  title: string;
  rating: string;
  outcome: string;
  iconName: RoadmapIconName;
  color: string;
  bg: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InquiryDocument {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "pending" | "contacted" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

export interface TrialBookingDocument {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  childAge: string;
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}
