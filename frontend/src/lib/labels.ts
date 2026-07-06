const COURSE_LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
  master: "Expert",
};

const LEAD_CATEGORY_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  competitive: "Competitive",
  hobbyist: "Hobbyist",
  master: "Expert",
};

export function toTitleLabel(value?: string | null): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatCourseLevel(value?: string | null): string {
  if (!value) return "-";
  return COURSE_LEVEL_LABELS[value.trim().toLowerCase()] || toTitleLabel(value);
}

export function formatLeadCategory(value?: string | null): string {
  if (!value) return "-";
  return LEAD_CATEGORY_LABELS[value.trim().toLowerCase()] || toTitleLabel(value);
}
