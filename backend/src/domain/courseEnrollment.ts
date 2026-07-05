export const COURSE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const SESSION_PLAN_OPTIONS = [10, 30, 60] as const;
export type SessionPlanSize = (typeof SESSION_PLAN_OPTIONS)[number];

export const COURSE_SESSION_TOTALS: Record<CourseLevel, number> = {
  Beginner: 30,
  Intermediate: 60,
  Advanced: 60,
  Expert: 30,
};

export const PLAN_LABELS = {
  10: '10 Sessions',
  30: '30 Sessions',
  60: '60 Sessions',
} as const satisfies Record<SessionPlanSize, string>;

export const RENEWAL_REMINDER_THRESHOLD = 3;

export class EnrollmentRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnrollmentRuleError';
  }
}

export function isCourseLevel(value: unknown): value is CourseLevel {
  return typeof value === 'string' && COURSE_LEVELS.includes(value as CourseLevel);
}

export function normalizeCourseLevel(value: string): CourseLevel {
  const normalized = value === 'Master' ? 'Expert' : value;
  if (!isCourseLevel(normalized)) {
    throw new EnrollmentRuleError(`Course level must be one of: ${COURSE_LEVELS.join(', ')}`);
  }
  return normalized;
}

export function getCourseSessionTotal(courseLevel: CourseLevel): number {
  return COURSE_SESSION_TOTALS[courseLevel];
}

export function getAllowedSessionPlans(courseLevel: CourseLevel): readonly SessionPlanSize[] {
  return COURSE_SESSION_TOTALS[courseLevel] === 30
    ? ([10, 30] as const)
    : SESSION_PLAN_OPTIONS;
}

export function getSessionPlanSize(packageType: string): SessionPlanSize | null {
  const entry = Object.entries(PLAN_LABELS).find(([, label]) => label === packageType);
  return entry ? (Number(entry[0]) as SessionPlanSize) : null;
}

export function validateSessionPlan(courseLevel: unknown, packageType: unknown): {
  courseLevel: CourseLevel;
  packageType: string;
  sessions: SessionPlanSize;
} {
  if (!isCourseLevel(courseLevel)) {
    throw new EnrollmentRuleError(`Course level must be one of: ${COURSE_LEVELS.join(', ')}`);
  }
  if (typeof packageType !== 'string') {
    throw new EnrollmentRuleError('A session plan is required');
  }
  const sessions = getSessionPlanSize(packageType);
  if (!sessions || !getAllowedSessionPlans(courseLevel).includes(sessions)) {
    throw new EnrollmentRuleError(
      `${packageType} is not available for ${courseLevel}. Allowed plans: ${getAllowedSessionPlans(courseLevel)
        .map((size) => PLAN_LABELS[size])
        .join(', ')}`
    );
  }
  return { courseLevel, packageType, sessions };
}

export function createBatchSessionPlan(courseLevel: CourseLevel) {
  return Array.from({ length: getCourseSessionTotal(courseLevel) }, (_, index) => ({
    sessionNumber: index + 1,
    status: 'planned' as const,
  }));
}

export function ensureBatchSessionPlan(batch: any): void {
  if (batch.courseLevel === 'Master') {
    batch.courseLevel = 'Expert';
  }
  if (!isCourseLevel(batch.courseLevel)) {
    throw new EnrollmentRuleError(`Unsupported batch course level: ${batch.courseLevel}`);
  }

  const totalSessions = getCourseSessionTotal(batch.courseLevel);
  batch.totalSessions = totalSessions;
  if (Array.isArray(batch.sessions) && batch.sessions.length === totalSessions) {
    return;
  }

  const legacyCompleted = Number(
    batch.sessionsCompleted ??
      batch.regularClassesCompleted ??
      (typeof batch.get === 'function' ? batch.get('regularClassesCompleted') : 0) ??
      0
  );
  const completedCount = Math.min(totalSessions, Math.max(0, legacyCompleted));
  batch.sessions = createBatchSessionPlan(batch.courseLevel).map((session) => ({
    ...session,
    status: session.sessionNumber <= completedCount ? ('completed' as const) : session.status,
  }));
  batch.sessionsCompleted = completedCount;
}
