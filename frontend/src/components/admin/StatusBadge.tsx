interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  // positive / active states
  active: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  completed: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  converted: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  paid: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  confirmed: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  resolved: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  enrolled: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  // pending / in-progress states
  pending: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  contacted: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  qualified: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  follow_up: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  waiting_for_activation: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  on_leave: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  pending_activation: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  // negative / attention states
  lost: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  cancelled: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  overdue: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  dropped: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  inactive: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  suspended: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  failed: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  expired: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  frozen: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  new: "border-[rgba(31,27,22,0.16)] bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status || "unknown";
  const style = STATUS_STYLES[normalizedStatus] || "border-[rgba(31,27,22,0.16)] bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]";
  const label = normalizedStatus.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      {label}
    </span>
  );
}
