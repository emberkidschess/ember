interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  // positive / active states
  active: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  completed: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  converted: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  paid: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  confirmed: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  resolved: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  enrolled: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  // pending / in-progress states
  pending: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  contacted: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  qualified: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  follow_up: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  waiting_for_activation: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  on_leave: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  pending_activation: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  // negative / attention states
  lost: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  cancelled: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  overdue: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  dropped: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  inactive: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  suspended: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  failed: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  expired: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  new: "bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || "bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]";
  const label = status.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${style}`}>
      {label}
    </span>
  );
}
