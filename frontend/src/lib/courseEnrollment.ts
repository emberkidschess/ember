export const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
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
  10: "10 Sessions",
  30: "30 Sessions",
  60: "60 Sessions",
} as const satisfies Record<SessionPlanSize, string>;

export function getAllowedSessionPlans(courseLevel: CourseLevel): readonly SessionPlanSize[] {
  return COURSE_SESSION_TOTALS[courseLevel] === 30 ? ([10, 30] as const) : SESSION_PLAN_OPTIONS;
}

export function getPlanSessionCount(packageType: string): number {
  const entry = Object.entries(PLAN_LABELS).find(([, label]) => label === packageType);
  return entry ? Number(entry[0]) : 0;
}
