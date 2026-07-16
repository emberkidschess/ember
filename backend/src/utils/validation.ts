import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { SUPPORTED_TIMEZONES } from './dateTime';
import { STAFF_PERMISSIONS } from '../constants/permissions';
import {
  COURSE_LEVELS,
  PLAN_LABELS,
  SESSION_PLAN_OPTIONS,
  getAllowedSessionPlans,
} from '../domain/courseEnrollment';

const courseLevelSchema = z.enum(COURSE_LEVELS);
const eventCountrySchema = z.enum(['US', 'CA', 'IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM']);
const sessionPlanSchema = z.enum(
  SESSION_PLAN_OPTIONS.map((size) => PLAN_LABELS[size]) as [
    string,
    ...string[],
  ]
);

function validPlanForCourse(value: { courseLevel?: string; packageType?: string }) {
  if (!value.courseLevel || !value.packageType) return true;
  const size = SESSION_PLAN_OPTIONS.find((candidate) => PLAN_LABELS[candidate] === value.packageType);
  return Boolean(
    size &&
      COURSE_LEVELS.includes(value.courseLevel as (typeof COURSE_LEVELS)[number]) &&
      getAllowedSessionPlans(value.courseLevel as (typeof COURSE_LEVELS)[number]).includes(size)
  );
}

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: `Validation failed: ${errors}` });
    }
    req.body = result.data;
    next();
  };
};

/**
 * Sanitizes query parameters to prevent NoSQL injection.
 * Only allows string values that don't contain MongoDB operators.
 * Returns null if the value is potentially dangerous.
 */
export const sanitizeQueryParam = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  
  // Check for MongoDB operators that could be used for injection
  const dangerousPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$gte/i,
    /\$lte/i,
    /\$in/i,
    /\$nin/i,
    /\$or/i,
    /\$and/i,
    /\$not/i,
    /\$exists/i,
    /\$regex/i,
    /\$expr/i,
    /\{/,
    /\}/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(value)) {
      return null;
    }
  }
  
  return value;
};

/**
 * Sanitizes pagination parameters to ensure they are valid numbers.
 */
export const sanitizePaginationParams = (page: unknown, limit: unknown) => {
  const pageNum = parseInt(sanitizeQueryParam(page) || '1', 10);
  const limitNum = parseInt(sanitizeQueryParam(limit) || '20', 10);
  
  // Ensure reasonable bounds
  const sanitizedPage = Math.max(1, Math.min(pageNum, 1000));
  const sanitizedLimit = Math.max(1, Math.min(limitNum, 100));
  
  return { page: sanitizedPage, limit: sanitizedLimit };
};

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  token: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid reset token'),
  newPassword: z.string().min(8).max(128),
});

// ---- Students ----

export const createStudentSchema = z.object({
  studentName: z.string().trim().min(1).max(120),
  parentName: z.string().trim().min(1).max(120),
  phoneNumber: z.string().trim().min(1).max(40),
  email: z.string().trim().toLowerCase().email().max(254),
  course: z.string().trim().min(1).max(120),
  country: z.enum(['US', 'CA', 'IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM']).optional(),
  address: z.string().trim().max(500).optional(),
  dateOfBirth: z.iso.date().optional(),
  enrollmentStatus: z.enum(['enrolled', 'pending', 'completed', 'dropped']).optional(),
  studentStatus: z.enum(['active', 'inactive', 'graduated', 'suspended']).optional(),
  assignedStaff: z.string().optional(),
  notes: z.string().trim().max(5000).optional(),
  leadId: z.string().optional(),
  timezone: z.enum(SUPPORTED_TIMEZONES).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

// ---- Staff ----

export const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['coach', 'staff']),
  expertise: z.array(z.string()).optional(),
  permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional(),
  salaryPerClass: z.number().optional(),
  defaultClassLink: z.url().refine((value) => /^https?:\/\//i.test(value), 'Default class link must use HTTP or HTTPS'),
});

export const updateStaffSchema = createStaffSchema.partial();

// ---- Classes ----

export const createClassSchema = z.object({
  students: z.array(z.string()).optional(),
  batch: z.string().optional(),
  coach: z.string().min(1),
  course: z.string().optional(),
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.enum(SUPPORTED_TIMEZONES).optional(),
  meetingLink: z.url().optional().or(z.literal('')),
  classType: z.enum(['regular', 'master', 'extra', 'trial', 'demo']).optional(),
  accessOpensMinutesBefore: z.number().int().min(5).max(10).optional(),
  extraClassReason: z.string().trim().max(1000).optional(),
  notes: z.string().optional(),
});

export const updateClassSchema = createClassSchema.partial();

export const rescheduleClassSchema = z.object({
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  reason: z.string().optional(),
});

export const cancelClassSchema = z.object({
  reason: z.string().min(1),
});

// ---- Batches ----

export const createBatchSchema = z.object({
  name: z.string().min(1),
  courseLevel: courseLevelSchema,
  coach: z.string().min(1),
  students: z.array(z.string()).optional(),
  frequencyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(
    (days) => new Set(days).size === days.length,
    'Frequency days must be unique'
  ),
  classStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  classDurationMinutes: z.number().int().min(15).max(480),
  accessOpensMinutesBefore: z.number().int().min(5).max(10).optional(),
  timezone: z.enum(SUPPORTED_TIMEZONES),
  startDate: z.iso.date(),
  // Accepted for backwards-compatible API clients, but the controller always
  // replaces it with the selected staff member's defaultClassLink.
  meetingLink: z.url().refine((value) => /^https?:\/\//i.test(value), 'Meeting link must use HTTP or HTTPS').optional(),
  notes: z.string().optional(),
  whatsappCommunityLink: z.url().refine(
    (value) => /^https?:\/\//i.test(value),
    'WhatsApp group link must use HTTP or HTTPS'
  ),
});

export const updateBatchSchema = createBatchSchema.partial();

// Academy events resolve their target batches on the server. Batch IDs are
// intentionally absent so the client cannot bypass the eligibility rules.
const academyEventBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  country: eventCountrySchema,
  timezone: z.enum(SUPPORTED_TIMEZONES),
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  meetingLink: z.url().refine((value) => /^https?:\/\//i.test(value), 'Meeting link must use HTTP or HTTPS'),
});

export const createMasterclassSchema = academyEventBaseSchema.extend({
  coach: z.string().min(1),
  level: courseLevelSchema,
});

export const createTournamentSchema = academyEventBaseSchema;

export const updateAcademyEventSchema = academyEventBaseSchema.partial().extend({
  coach: z.string().min(1).optional(),
  level: courseLevelSchema.optional(),
});

export const renameBatchSchema = z.object({
  name: z.string().min(1),
  courseLevel: courseLevelSchema.optional(),
});

export const addStudentsToBatchSchema = z.object({
  studentIds: z.array(z.string()).min(1),
});

export const updateBatchStatusSchema = z.object({
  status: z.enum(['upcoming', 'ongoing', 'completed']),
});

export const createExtraClassSchema = z.object({
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.enum(SUPPORTED_TIMEZONES),
  durationMinutes: z.number().int().min(15).max(480),
  meetingLink: z.url().refine((value) => /^https?:\/\//i.test(value), 'Meeting link must use HTTP or HTTPS'),
  accessOpensMinutesBefore: z.number().int().min(5).max(10).optional(),
  reason: z.string().trim().max(1000).optional(),
});

// ---- Attendance ----
// Manual create/update of attendance records no longer exists - records are
// pre-created as NOT_MARKED when a Class is scheduled, then transition via
// click-tracking, the auto-absent cron, dispute, or coach override. See
// joinClassSchema / raiseDisputeSchema / resolveDisputeSchema /
// overrideAttendanceSchema further down in this file.

// ---- Packages ----

const packagePayloadSchema = z.object({
  student: z.string().min(1),
  packageType: sessionPlanSchema,
  courseLevel: courseLevelSchema,
});

export const createPackageSchema = packagePayloadSchema.refine(validPlanForCourse, {
  message: 'Selected session plan is not available for this course',
  path: ['packageType'],
});

export const updatePackageSchema = packagePayloadSchema.partial().refine(validPlanForCourse, {
  message: 'Selected session plan is not available for this course',
  path: ['packageType'],
});

export const renewPackageSchema = z.object({
  packageType: sessionPlanSchema,
});

export const upgradePackageSchema = z.object({
  newCourseLevel: courseLevelSchema,
  packageType: sessionPlanSchema,
}).refine(
  (value) => validPlanForCourse({ courseLevel: value.newCourseLevel, packageType: value.packageType }),
  {
    message: 'Selected session plan is not available for the new course',
    path: ['packageType'],
  }
);

// ---- Payment Links ----

export const createPaymentLinkSchema = z.object({
  purpose: z.enum(['new_package', 'renewal', 'upgrade']),
  lead: z.string().optional(),
  student: z.string().optional(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'CAD', 'INR', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR']),
  packageType: sessionPlanSchema.optional(),
  courseLevel: courseLevelSchema.optional(),
  notes: z.string().optional(),
  previousPackageId: z.string().optional(),
}).refine(validPlanForCourse, {
  message: 'Selected session plan is not available for this course',
  path: ['packageType'],
});

export const updatePaymentLinkSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.enum(['USD', 'CAD', 'INR', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR']).optional(),
  packageType: sessionPlanSchema.optional(),
  courseLevel: courseLevelSchema.optional(),
  notes: z.string().max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one editable field is required',
});

export const sendPaymentLinkSchema = z.object({
  channels: z.array(z.enum(['email', 'whatsapp', 'copy_link'])).min(1),
});

export const markPaymentReceivedSchema = z.object({
  reference: z.string().optional(),
});

export const activatePackageSchema = z.object({
  assignedCoach: z.string().min(1),
  batch: z.string().min(1),
  schedule: z.string().min(1),
  timezone: z.enum(SUPPORTED_TIMEZONES).optional(),
});

// ---- Payments (merged ledger - replaces old Payment + PackagePurchase split) ----

export const createPaymentSchema = z.object({
  student: z.string().optional(),
  lead: z.string().optional(),
  paymentLink: z.string().optional(),
  package: z.string().optional(),
  packageType: z.string().min(1),
  courseLevel: courseLevelSchema,
  amount: z.number().positive(),
  currency: z.enum(['USD', 'CAD', 'INR', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR']),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
  manualPaymentReference: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  notes: z.string().max(2000),
});

// ---- Evaluation Reports ----

export const createEvaluationReportSchema = z.object({
  student: z.string().min(1),
  package: z.string().min(1),
  coach: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  strengths: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  weaknesses: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  tacticalSkills: z.number().int().min(1).max(10),
  openingKnowledge: z.number().int().min(1).max(10),
  endgameUnderstanding: z.number().int().min(1).max(10),
  coachNotes: z.string().trim().max(5000).default(''),
  recommendedNextLevel: z.enum([...COURSE_LEVELS, 'Renew']),
});

export const updateEvaluationReportSchema = createEvaluationReportSchema
  .omit({ student: true, package: true, coach: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one report field is required',
  });

// ---- Lead ----

export const createPublicLeadSchema = z.object({
  studentName: z.string().min(1),
  parentName: z.string().min(1),
  phoneNumber: z.string().min(1),
  email: z.string().email(),
  courseInterest: z.string().min(1),
  message: z.string().optional(),
  country: z.enum(['US', 'CA', 'IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM']).optional(),
});

export const createLeadSchema = createPublicLeadSchema.extend({
  leadSource: z.enum(['website', 'referral', 'social_media', 'advertisement', 'event', 'word_of_mouth', 'other']).optional(),
  leadCategory: z.enum(['beginner', 'intermediate', 'advanced', 'competitive', 'hobbyist']).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'trial_scheduled', 'ready_to_join', 'not_ready', 'converted', 'lost', 'follow_up']).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

// ---- Inquiry / Roadmap ----

export const updateInquirySchema = z.object({
  status: z.enum(['pending', 'contacted', 'resolved']),
});

// ---- Portal Freeze/Pause ----

export const freezePortalSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

// unfreezePortalSchema intentionally takes no body - the action itself is the input.

// ---- Attendance: Click-tracking, Dispute, Override ----

export const joinClassSchema = z.object({
  classId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid class ID'),
});

export const raiseDisputeSchema = z.object({
  disputeReason: z.string().trim().min(3).max(500),
});

export const resolveDisputeSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
});

export const overrideAttendanceSchema = z.object({
  status: z.enum(['present', 'absent']),
  notes: z.string().optional(),
});

// ---- Class Notes Hub ----

export const postClassNotesSchema = z.object({
  classNotes: z.string().min(1),
});

// ---- Trial Evaluation (Ready to Join / Not Ready) ----

export const markTrialResultSchema = z.object({
  trialResult: z.enum(['recommended', 'not_recommended', 'needs_follow_up', 'reschedule_requested']),
  trialResultNotes: z.string().optional(),
});

const meetingLinkSchema = z.url().refine((value) => /^https?:\/\//i.test(value), {
  message: 'Meeting link must start with http:// or https://',
});

export const scheduleTrialClassSchema = z.object({
  leadId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid lead ID'),
  coach: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid coach ID'),
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.enum(SUPPORTED_TIMEZONES).optional(),
  meetingLink: meetingLinkSchema,
});

export const rescheduleTrialClassSchema = scheduleTrialClassSchema.omit({ leadId: true, coach: true });

export const provisionAccessSchema = z.object({
  password: z.string().min(8).max(128),
});

export const staffStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});
