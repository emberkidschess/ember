import { adminFetchJSON } from "./auth";

// ─── Shared loose-shape types ──────────────────────────────────────────────────
// These replace `any` for endpoints where the backend returns an open-ended
// JSON shape that we don't fully model (dashboard summaries, notifications, etc.)

/** Generic dashboard stats blob returned by /dashboard/admin and /dashboard/staff */
export type DashboardData = Record<string, unknown>;

/** A notification document (shape may vary by type) */
export interface NotificationItem {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  [key: string]: unknown;
}

/** A payment record (shape may vary by provider) */
export interface PaymentItem {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

/** Site config as returned/accepted by the admin API */
export type SiteConfigPayload = Record<string, unknown>;

/** Activation result from /payment-links/:id/activate */
export interface ActivationResult {
  student?: { _id: string; studentName: string; email: string };
  batch?: { _id: string; name: string };
  [key: string]: unknown;
}

type ListQueryParams = Record<string, string | number | boolean | undefined>;

function toQueryString(params?: ListQueryParams): string {
  if (!params) return "";
  const entries = Object.entries(params)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== "");
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString()}` : "";
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiItemResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// ---------- Dashboard ----------

export const getAdminDashboard = () => adminFetchJSON<ApiItemResponse<DashboardData>>("/dashboard/admin");
export const getStaffDashboard = () => adminFetchJSON<ApiItemResponse<DashboardData>>("/dashboard/staff");
export const getAuditLogs = () => adminFetchJSON<ApiListResponse<AuditLogEntry>>("/dashboard/audit-logs");

// ---------- Academy events ----------

export type AcademyEventType = "masterclass" | "tournament";

export interface AcademyEvent {
  _id: string;
  type: AcademyEventType;
  name: string;
  country: string;
  timezone: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  coach?: { _id: string; name: string; email?: string };
  level?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  meetingLink?: string;
  status: "scheduled" | "completed" | "cancelled";
  eligibleBatchCount?: number;
  accessOpensAt?: string;
  startsAt?: string;
  joinClosesAt?: string;
  createdAt?: string;
}

export interface AcademyEventPayload {
  name: string;
  country: string;
  timezone: string;
  date: string;
  startTime: string;
  durationMinutes?: number;
  meetingLink: string;
  coach?: string;
  level?: string;
}

export const getAcademyEvents = (type: AcademyEventType, params?: { country?: string; timezone?: string; coach?: string; level?: string; date?: string; status?: string }) =>
  adminFetchJSON<ApiListResponse<AcademyEvent>>(`/events/${type}${toQueryString(params)}`);
export const createMasterclass = (payload: AcademyEventPayload) =>
  adminFetchJSON<ApiItemResponse<AcademyEvent>>("/events/masterclass", { method: "POST", body: JSON.stringify(payload) });
export const createTournament = (payload: AcademyEventPayload) =>
  adminFetchJSON<ApiItemResponse<AcademyEvent>>("/events/tournament", { method: "POST", body: JSON.stringify(payload) });
export const updateAcademyEvent = (type: AcademyEventType, id: string, payload: Partial<AcademyEventPayload>) =>
  adminFetchJSON<ApiItemResponse<AcademyEvent>>(`/events/${type}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const cancelAcademyEvent = (type: AcademyEventType, id: string) =>
  adminFetchJSON<ApiItemResponse<AcademyEvent>>(`/events/${type}/${id}/cancel`, { method: "POST" });

export interface CoachReports {
  summary: {
    totalClassesConducted: number;
    totalDemoClasses: number;
    totalTrialClasses: number;
    totalMasterclassesConducted: number;
    totalCoverUpClasses: number;
  };
  studentTrialReport: Record<string, unknown>[];
  batchReport: Record<string, unknown>[];
  masterclassReport: Record<string, unknown>[];
  coverUpReport: Record<string, unknown>[];
}

export const getCoachReports = (params?: { coach?: string; dateFrom?: string; dateTo?: string; country?: string; timezone?: string }) =>
  adminFetchJSON<ApiItemResponse<CoachReports>>(`/reports/coaches${toQueryString(params)}`);

// ---------- Leads ----------

export interface Lead {
  _id: string;
  studentName: string;
  parentName: string;
  phoneNumber: string;
  country?: "US" | "CA" | "IN" | "SA" | "AE" | "QA" | "KW" | "BH" | "OM";
  email: string;
  courseInterest: string;
  leadSource: string;
  leadCategory: string;
  status: string;
  notes?: string;
  assignedTo?: { _id: string; name: string; email: string } | string;
  followUpDate?: string;
  lastContactDate?: string;
  convertedToStudent?: boolean;
  studentId?: string;
  createdAt: string;
}

export const getLeads = (params?: { status?: string; source?: string; category?: string; page?: string | number; limit?: string | number; includeConverted?: boolean }) =>
  adminFetchJSON<ApiListResponse<Lead>>(`/leads${toQueryString({ limit: 100, ...params })}`);
export const getLead = (id: string) => adminFetchJSON<ApiItemResponse<Lead>>(`/leads/${id}`);
export const createLead = (payload: Partial<Lead>) =>
  adminFetchJSON<ApiItemResponse<Lead>>("/leads", { method: "POST", body: JSON.stringify(payload) });
export const updateLead = (id: string, payload: Partial<Lead>) =>
  adminFetchJSON<ApiItemResponse<Lead>>(`/leads/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteLead = (id: string) =>
  adminFetchJSON<ApiItemResponse<null>>(`/leads/${id}`, { method: "DELETE" });

// ---------- Students ----------

export interface Student {
  _id: string;
  studentName: string;
  parentName: string;
  phoneNumber: string;
  country?: "US" | "CA" | "IN" | "SA" | "AE" | "QA" | "KW" | "BH" | "OM";
  email: string;
  course: string;
  courseLevel?: string;
  enrollmentStatus: string;
  studentStatus: string;
  status?: string;
  assignedStaff?: { _id: string; name: string; email: string } | string;
  currentPackageId?: string | {
    _id: string;
    packageType: string;
    courseLevel: string;
    status: string;
    totalClasses: number;
    completedClasses: number;
    remainingClasses: number;
    regularClassesCompleted?: number;
    enrollmentDate?: string;
  };
  lastReportDate?: string;
  notes?: string;
  portalStatus?: "active" | "frozen" | "expired";
  frozenReason?: string;
  frozenAt?: string;
  createdAt: string;
}

export const getStudents = (params?: { status?: string; enrollmentStatus?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<Student>>(`/students${toQueryString({ limit: 100, ...params })}`);
export const getStudent = (id: string) => adminFetchJSON<ApiItemResponse<Student>>(`/students/${id}`);
export const createStudent = (payload: Partial<Student>) =>
  adminFetchJSON<ApiItemResponse<Student>>("/students", { method: "POST", body: JSON.stringify(payload) });
export const updateStudent = (id: string, payload: Partial<Student>) =>
  adminFetchJSON<ApiItemResponse<Student>>(`/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteStudent = (id: string) =>
  adminFetchJSON<ApiItemResponse<null>>(`/students/${id}`, { method: "DELETE" });
// Pause a student's classes/package countdown (e.g. exam leave) - they stay
// enrolled and can still log in, but drop out of new batch scheduling.
export const freezeStudentPortal = (id: string, reason: string) =>
  adminFetchJSON<ApiItemResponse<Student>>(`/students/${id}/freeze`, { method: "POST", body: JSON.stringify({ reason }) });
export const unfreezeStudentPortal = (id: string) =>
  adminFetchJSON<ApiItemResponse<Student>>(`/students/${id}/unfreeze`, { method: "POST" });
// ---------- Packages ----------

export interface StudentPackage {
  _id: string;
  student: { _id: string; studentName: string; parentName?: string; email: string } | string;
  packageType: "10 Sessions" | "30 Sessions" | "60 Sessions";
  courseLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  totalClasses: number;
  completedClasses: number;
  remainingClasses: number;
  regularClassesCompleted: number;
  status: "active" | "queued" | "completed" | "expired" | "upgraded";
  enrollmentDate: string;
  createdAt: string;
}

export interface PackagePayload {
  student: string;
  packageType: StudentPackage["packageType"];
  courseLevel: StudentPackage["courseLevel"];
}

export const getPackages = (params?: { student?: string; status?: string; courseLevel?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<StudentPackage>>(`/packages${toQueryString({ limit: 100, ...params })}`);
export const createPackageRecord = (payload: PackagePayload) =>
  adminFetchJSON<ApiItemResponse<StudentPackage>>("/packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const updatePackageRecord = (id: string, payload: Partial<PackagePayload>) =>
  adminFetchJSON<ApiItemResponse<StudentPackage>>(`/packages/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
export const deletePackageRecord = (id: string) =>
  adminFetchJSON<ApiItemResponse<null>>(`/packages/${id}`, { method: "DELETE" });

// ---------- Staff ----------

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: "coach" | "staff";
  status: "active" | "inactive" | "on_leave";
  expertise?: string[];
  permissions?: string[];
  salaryPerClass?: number;
  defaultClassLink?: string;
  createdAt: string;
}

export const getStaffList = (role?: "coach" | "staff") =>
  adminFetchJSON<ApiListResponse<StaffMember>>(`/staff${role ? `?role=${role}` : ""}`);
export const getStaffMember = (id: string) => adminFetchJSON<ApiItemResponse<StaffMember>>(`/staff/${id}`);
export const createStaffMember = (payload: { name: string; email: string; role: string; expertise?: string[]; permissions?: string[]; salaryPerClass?: number; defaultClassLink: string }) =>
  adminFetchJSON<ApiItemResponse<StaffMember & { tempPassword?: string }>>("/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const updateStaffMember = (id: string, payload: Partial<StaffMember>) =>
  adminFetchJSON<ApiItemResponse<StaffMember>>(`/staff/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const updateStaffPermissions = (id: string, permissions: string[]) =>
  adminFetchJSON<ApiItemResponse<StaffMember>>(`/staff/${id}`, { method: "PUT", body: JSON.stringify({ permissions }) });
export const deleteStaffMember = (id: string) =>
  adminFetchJSON<ApiItemResponse<null>>(`/staff/${id}`, { method: "DELETE" });
export const toggleStaffStatus = (id: string, status: string) =>
  adminFetchJSON<ApiItemResponse<StaffMember>>(`/staff/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const resetStaffPassword = (id: string) =>
  adminFetchJSON<ApiItemResponse<{ tempPassword: string }>>(`/staff/${id}/reset-password`, { method: "POST" });

// ---------- Payment Links ----------

export interface PaymentLink {
  _id: string;
  student?: { _id: string; studentName: string; parentName: string; email: string; phone?: string } | string;
  lead?: { _id: string; studentName: string; parentName: string; email: string; phoneNumber?: string } | string;
  packageType: string;
  courseLevel: string;
  amount: number;
  currency: string;
  status: "active" | "expired" | "waiting_for_activation" | "activated" | "cancelled";
  purpose: "new_package" | "renewal" | "upgrade";
  paymentMethod?: "wise";
  manualPaymentReference?: string;
  shareableUrl?: string;
  expiresAt?: string;
  paidAt?: string;
  verifiedBy?: { _id: string; name: string; email: string } | string;
  sentVia?: string[];
  sentAt?: string;
  activatedAt?: string;
  createdAt: string;
}

export interface PaymentLinkDeliveryFailure {
  channel: "email" | "whatsapp" | "copy_link";
  error: string;
}

export interface PaymentLinkShareResponse extends ApiItemResponse<PaymentLink> {
  deliveryResults?: {
    deliveredChannels: ("email" | "whatsapp" | "copy_link")[];
    failedDeliveries: PaymentLinkDeliveryFailure[];
  };
}

export const getPaymentLinks = (params?: { student?: string; status?: string; purpose?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<PaymentLink>>(`/payment-links${toQueryString({ limit: 100, ...params })}`);
export const getPendingActivations = () => adminFetchJSON<ApiListResponse<PaymentLink>>("/payment-links/pending-activations");
export const createPaymentLink = (payload: Record<string, unknown>) =>
  adminFetchJSON<ApiItemResponse<PaymentLink & { contact?: { name: string; email: string; phone: string } }>>("/payment-links", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const sendPaymentLink = (id: string, channels: ("email" | "whatsapp" | "copy_link")[]) =>
  adminFetchJSON<PaymentLinkShareResponse>(`/payment-links/${id}/send`, {
    method: "POST",
    body: JSON.stringify({ channels }),
  });
export const markPaymentReceived = (id: string, reference?: string) =>
  adminFetchJSON<ApiItemResponse<PaymentLink>>(`/payment-links/${id}/mark-paid`, {
    method: "POST",
    body: JSON.stringify({ reference }),
  });
export const activatePackage = (paymentLinkId: string, payload: { assignedCoach: string; batch: string; schedule: string }) =>
  adminFetchJSON<ApiItemResponse<ActivationResult>>(`/payment-links/${paymentLinkId}/activate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// ---------- Site Config ----------

export const getSiteConfig = () => adminFetchJSON<ApiItemResponse<SiteConfigPayload>>("/site/config");
export const updateSiteConfig = (payload: SiteConfigPayload) =>
  adminFetchJSON<ApiItemResponse<SiteConfigPayload>>("/site/config", { method: "PUT", body: JSON.stringify(payload) });

// ---------- Batches ----------

export interface Batch {
  _id: string;
  name: string;
  courseLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  coach: { _id: string; name: string; email: string } | string;
  students: { _id: string; studentName: string; parentName: string; email: string; studentStatus: string }[];
  studentCount?: number;
  status: "upcoming" | "ongoing" | "completed";
  schedule?: string;
  timezone?: string;
  startDate?: string;
  automationEnabled?: boolean;
  frequencyDays?: number[];
  classStartTime?: string;
  classDurationMinutes?: number;
  meetingLink?: string;
  whatsappCommunityLink?: string;
  accessOpensMinutesBefore?: number;
  nextUpcomingClass?: {
    _id: string;
    course: string;
    classType: "regular" | "master" | "extra" | "trial" | "demo";
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
    accessOpensAt: string;
    startsAt: string;
    accessClosesAt: string;
  } | null;
  completedAt?: string;
  notes?: string;
  totalSessions: number;
  sessionsCompleted: number;
  sessions: {
    sessionNumber: number;
    status: "planned" | "scheduled" | "completed";
    classId?: string;
  }[];
  createdAt: string;
}

export const getBatches = (params?: { status?: string; courseLevel?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<Batch>>(`/batches${toQueryString({ limit: 100, ...params })}`);
export const getBatchHistory = () => adminFetchJSON<ApiListResponse<Batch>>("/batches/history");
export const getBatch = (id: string) => adminFetchJSON<ApiItemResponse<Batch>>(`/batches/${id}`);
export const createBatch = (payload: Partial<Omit<Batch, "_id" | "createdAt">> & { students?: string[] }) =>
  adminFetchJSON<ApiItemResponse<Batch>>("/batches", { method: "POST", body: JSON.stringify(payload) });
export const updateBatch = (id: string, payload: Partial<Omit<Batch, "_id" | "createdAt">>) =>
  adminFetchJSON<ApiItemResponse<Batch>>(`/batches/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const renameBatch = (id: string, name: string, courseLevel?: string) =>
  adminFetchJSON<ApiItemResponse<Batch>>(`/batches/${id}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ name, ...(courseLevel ? { courseLevel } : {}) }),
  });
export const updateBatchStatus = (id: string, status: string) =>
  adminFetchJSON<ApiItemResponse<Batch>>(`/batches/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const addStudentsToBatch = (id: string, studentIds: string[]) =>
  adminFetchJSON<ApiItemResponse<Batch>>(`/batches/${id}/students`, {
    method: "POST",
    body: JSON.stringify({ studentIds }),
  });
export const removeStudentFromBatch = (id: string, studentId: string) =>
  adminFetchJSON<ApiItemResponse<Batch>>(`/batches/${id}/students/${studentId}`, { method: "DELETE" });
export const deleteBatch = (id: string) =>
  adminFetchJSON<ApiItemResponse<null>>(`/batches/${id}`, { method: "DELETE" });
export const createExtraClass = (
  id: string,
  payload: {
    date: string;
    startTime: string;
    timezone: string;
    durationMinutes: number;
    meetingLink: string;
    accessOpensMinutesBefore?: number;
    reason?: string;
  }
) =>
  adminFetchJSON<ApiItemResponse<ClassItem>>(`/batches/${id}/extra-classes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
// ---------- Classes ----------

export interface ClassItem {
  _id: string;
  students: { _id: string; studentName: string }[] | string[];
  batch?: { _id: string; name: string; status?: string; schedule?: string; whatsappCommunityLink?: string } | string;
  coach: { _id: string; name: string } | string;
  course: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingLink?: string;
  classType: "regular" | "master" | "extra" | "trial" | "demo";
  status: string;
  notes?: string;
  extraClassReason?: string;
  accessOpensMinutesBefore?: number;
  accessOpensAt?: string;
  startsAt?: string;
  accessClosesAt?: string;
  canStart?: boolean;
  createdAt: string;
}

export const getClasses = (params?: { status?: string; student?: string; batch?: string; coach?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<ClassItem>>(`/classes${toQueryString({ limit: 100, ...params })}`);

export const getClass = (id: string) => adminFetchJSON<ApiItemResponse<ClassItem>>(`/classes/${id}`);
export const createClass = (payload: Partial<Omit<ClassItem, "_id" | "createdAt">>) =>
  adminFetchJSON<ApiItemResponse<ClassItem>>("/classes", { method: "POST", body: JSON.stringify(payload) });
export const updateClass = (id: string, payload: Partial<Omit<ClassItem, "_id" | "createdAt">>) =>
  adminFetchJSON<ApiItemResponse<ClassItem>>(`/classes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const rescheduleClass = (id: string, payload: { date: string; startTime: string; endTime: string; reason?: string }) =>
  adminFetchJSON<ApiItemResponse<ClassItem>>(`/classes/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const cancelClass = (id: string, reason: string) =>
  adminFetchJSON<ApiItemResponse<ClassItem>>(`/classes/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export interface TrialClass {
  _id: string;
  leadId?: { _id: string; studentName: string; parentName: string; email: string; phoneNumber: string };
  coach: { _id: string; name: string; email: string };
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingLink?: string;
  status?: "scheduled" | "completed" | "missed" | "cancelled";
  trialResult: "recommended" | "not_recommended" | "needs_follow_up" | "reschedule_requested" | "expired" | "pending";
  trialResultNotes?: string;
  trialResultMarkedBy?: { name: string; email: string };
  trialResultMarkedAt?: string;
  trialAttendanceStatus?: "not_marked" | "attended" | "no_show";
  trialJoinedAt?: string;
  trialAttemptNumber?: number;
  trialReminderSentAt?: string;
  trialExpiresAt?: string;
}

export const getTrialClasses = (params?: { status?: string; coach?: string }) =>
  adminFetchJSON<ApiListResponse<TrialClass>>(`/classes/trials${toQueryString(params)}`);
export const scheduleTrialClass = (payload: {
  leadId: string;
  coach: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingLink: string;
}) =>
  adminFetchJSON<ApiItemResponse<TrialClass>>("/classes/trials/schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const rescheduleTrialClass = (
  id: string,
  payload: {
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
    meetingLink: string;
  }
) =>
  adminFetchJSON<ApiItemResponse<TrialClass>>(`/classes/trials/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const markTrialClassResult = (
  id: string,
  payload: { trialResult: "recommended" | "not_recommended" | "needs_follow_up" | "reschedule_requested"; trialResultNotes?: string }
) =>
  adminFetchJSON<ApiItemResponse<TrialClass>>(`/classes/trials/${id}/result`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// ---------- Attendance ----------

export interface AttendanceItem {
  _id: string;
  class: { _id: string; course: string; date: string; startTime: string; endTime: string; classType?: string };
  student: { _id: string; studentName: string; parentName: string; email: string; phone: string };
  coach: { _id: string; name: string; email: string };
  status: "not_marked" | "present" | "absent" | "disputed";
  source?: "student_click" | "auto_absent_cron" | "coach_override" | "student_dispute";
  markedBy?: { _id: string; name: string; email: string };
  markedAt?: string;
  joinClickedAt?: string;
  notes?: string;
  attendanceConsumed: boolean;
  disputeReason?: string;
  disputeRaisedAt?: string;
  disputeResolvedAt?: string;
  disputeResolvedBy?: { _id: string; name: string; email: string };
  disputeApproved?: boolean;
}

export const getAttendance = (params?: { student?: string; coach?: string; status?: string; dateFrom?: string; dateTo?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<AttendanceItem>>(`/attendance${toQueryString({ limit: 100, ...params })}`);

export const getAttendanceStats = (params?: { student?: string; coach?: string }) =>
  adminFetchJSON<ApiItemResponse<{ total: number; present: number; absent: number; disputed: number; notMarked: number; attendanceRate: number }>>(`/attendance/stats${toQueryString(params)}`);

// Coach's review queue for student-raised disputes
export const getDisputedAttendance = (coach?: string) =>
  adminFetchJSON<ApiListResponse<AttendanceItem>>(`/attendance/disputes${coach ? `?coach=${coach}` : ""}`);

// Coach approves/rejects a dispute
export const resolveDispute = (id: string, approved: boolean, notes?: string) =>
  adminFetchJSON<ApiItemResponse<AttendanceItem>>(`/attendance/${id}/resolve-dispute`, {
    method: "PATCH",
    body: JSON.stringify({ approved, notes }),
  });

// Coach's direct manual correction (bypasses the dispute queue)
export const overrideAttendance = (id: string, status: "present" | "absent", notes?: string) =>
  adminFetchJSON<ApiItemResponse<AttendanceItem>>(`/attendance/${id}/override`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });

export const deleteAttendance = (id: string) =>
  adminFetchJSON<ApiItemResponse<null>>(`/attendance/${id}`, { method: "DELETE" });

// ---------- Evaluation Reports ----------

export interface EvaluationReport {
  _id: string;
  student: { _id: string; studentName: string; parentName?: string; email?: string } | string;
  package: { _id: string; packageType: string; courseLevel: string; status: string } | string;
  coach: { _id: string; name: string; email?: string } | string;
  title: string;
  strengths: string[];
  weaknesses: string[];
  tacticalSkills: number;
  openingKnowledge: number;
  endgameUnderstanding: number;
  coachNotes: string;
  recommendedNextLevel: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

export interface EvaluationReportPayload {
  student: string;
  package: string;
  coach: string;
  title: string;
  strengths: string[];
  weaknesses: string[];
  tacticalSkills: number;
  openingKnowledge: number;
  endgameUnderstanding: number;
  coachNotes: string;
  recommendedNextLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert" | "Renew";
}

export const getEvaluationReports = (params?: { student?: string; package?: string; coach?: string; recommendedNextLevel?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<EvaluationReport>>(`/evaluation-reports${toQueryString({ limit: 100, ...params })}`);
export const getStudentEvaluationReports = (studentId: string) =>
  adminFetchJSON<ApiListResponse<EvaluationReport>>(`/evaluation-reports/student/${studentId}`);
export const createEvaluationReport = (payload: EvaluationReportPayload) =>
  adminFetchJSON<ApiItemResponse<EvaluationReport>>("/evaluation-reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const updateEvaluationReport = (id: string, payload: Partial<Omit<EvaluationReportPayload, "student" | "package" | "coach">>) =>
  adminFetchJSON<ApiItemResponse<EvaluationReport>>(`/evaluation-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
export const publishEvaluationReport = (id: string) =>
  adminFetchJSON<ApiItemResponse<EvaluationReport>>(`/evaluation-reports/${id}/publish`, { method: "POST" });
export const deleteEvaluationReport = (id: string) =>
  adminFetchJSON<ApiItemResponse<null>>(`/evaluation-reports/${id}`, { method: "DELETE" });

// ---------- Audit Logs ----------

export interface AuditLogEntry {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
}

export const getAuditLogsByEntity = (entityId: string) =>
  adminFetchJSON<ApiListResponse<AuditLogEntry>>(`/dashboard/audit-logs?entityId=${entityId}`);

// ---------- Notifications ----------

export const getNotifications = (params?: { student?: string }) =>
  adminFetchJSON<ApiListResponse<NotificationItem>>(`/notifications${toQueryString(params)}`);

// ---------- Payments ----------

export const getPayments = (params?: { student?: string; status?: string; page?: string | number; limit?: string | number }) =>
  adminFetchJSON<ApiListResponse<PaymentItem>>(`/payments${toQueryString({ limit: 100, ...params })}`);

// ---------- Student Portal Access ----------
export const provisionStudentAccess = (id: string, password: string) =>
  adminFetchJSON<ApiItemResponse<{ email: string; isNew: boolean }>>(`/students/${id}/provision-access`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
