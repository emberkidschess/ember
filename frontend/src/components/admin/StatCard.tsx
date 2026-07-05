interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "ember" | "pine" | "gold" | "walnut";
  hint?: string;
}

const ACCENT_CLASSES: Record<string, string> = {
  ember: "bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]",
  pine: "bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]",
  gold: "bg-[var(--color-gold)]/15 text-[#8a6418]",
  walnut: "bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]",
};

export default function StatCard({ label, value, icon: Icon, accent = "walnut", hint }: StatCardProps) {
  return (
    <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${ACCENT_CLASSES[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-walnut)] font-[family-name:var(--font-playfair)]">{value}</p>
      <p className="text-sm text-[var(--color-muted)] mt-0.5">{label}</p>
      {hint && <p className="text-xs text-[var(--color-muted)] mt-2">{hint}</p>}
    </div>
  );
}
