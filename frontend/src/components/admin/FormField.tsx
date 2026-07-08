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
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label} {required && <span className="text-[var(--color-ember)]">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--color-muted)] mt-1">{hint}</p>}
      {error && <p className="text-xs text-[var(--color-ember-deep)] mt-1">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full px-3.5 h-[44px] rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-sm text-[var(--color-walnut)] placeholder:text-[var(--color-muted)]";

export const textareaClass =
  "w-full px-3.5 py-3 rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-sm text-[var(--color-walnut)] placeholder:text-[var(--color-muted)] resize-none";

export const selectClass = inputClass + " cursor-pointer";

export const primaryButtonClass =
  "px-5 h-[44px] rounded-[14px] bg-[var(--color-walnut)] hover:bg-[var(--color-ember-deep)] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";

export const secondaryButtonClass =
  "px-5 h-[44px] rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] hover:bg-[var(--color-ivory)] text-[var(--color-walnut)] font-bold text-sm transition inline-flex items-center justify-center gap-2";

export const dangerButtonClass =
  "px-5 h-[44px] rounded-[14px] bg-[var(--color-ember)] hover:bg-[var(--color-ember-deep)] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-2";
