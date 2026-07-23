interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  // positive / active states
  active: "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  completed: "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  converted: "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  paid: "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  confirmed: "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  resolved: "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  enrolled: "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  // pending / in-progress states
  pending: "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]",
  contacted: "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]",
  qualified: "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]",
  follow_up: "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]",
  waiting_for_activation: "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]",
  on_leave: "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]",
  pending_activation: "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]",
  // negative / attention states
  lost: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  cancelled: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  overdue: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  dropped: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  inactive: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  suspended: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  failed: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  expired: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  frozen: "border-[rgba(224,74,21,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  new: "border-[rgba(23,35,31,0.16)] bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status || "unknown";
  const style = STATUS_STYLES[normalizedStatus] || "border-[rgba(23,35,31,0.16)] bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]";
  const label = normalizedStatus.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      {label}
    </span>
  );
}
