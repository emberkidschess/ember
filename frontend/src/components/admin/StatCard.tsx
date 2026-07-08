interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "ember" | "pine" | "gold" | "walnut";
  hint?: string;
}

const ACCENT_CLASSES: Record<string, string> = {
  ember: "border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  pine: "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  gold: "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]",
  walnut: "border-[rgba(31,27,22,0.16)] bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]",
};

export default function StatCard({ label, value, icon: Icon, accent = "walnut", hint }: StatCardProps) {
  return (
    <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--color-line-strong)]">
      <div className="mb-4 flex items-start justify-between">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${ACCENT_CLASSES[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold leading-none text-[var(--color-walnut)]">{value}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-muted)]">{label}</p>
      {hint && <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
