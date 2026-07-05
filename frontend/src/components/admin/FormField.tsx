interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
        {label} {required && <span className="text-[var(--color-ember)]">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--color-muted)] mt-1">{hint}</p>}
      {error && <p className="text-xs text-[var(--color-ember-deep)] mt-1">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full px-3.5 h-[44px] rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-sm text-[var(--color-walnut)]";

export const textareaClass =
  "w-full px-3.5 py-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-sm text-[var(--color-walnut)] resize-none";

export const selectClass = inputClass + " cursor-pointer";

export const primaryButtonClass =
  "px-5 h-[44px] rounded-xl bg-[var(--color-walnut)] hover:bg-[var(--color-ember)] text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";

export const secondaryButtonClass =
  "px-5 h-[44px] rounded-xl border border-[var(--color-line)] hover:bg-[var(--color-ivory)] text-[var(--color-walnut)] font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2";

export const dangerButtonClass =
  "px-5 h-[44px] rounded-xl bg-[var(--color-ember)] hover:bg-[var(--color-ember-deep)] text-white font-semibold text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2";
