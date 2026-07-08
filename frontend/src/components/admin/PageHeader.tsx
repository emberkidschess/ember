import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type PageHeaderAction = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
};

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode | PageHeaderAction[];
}

function isActionList(actions: PageHeaderProps["actions"]): actions is PageHeaderAction[] {
  return Array.isArray(actions) && actions.every((action) => typeof action === "object" && action !== null && "label" in action);
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  const renderedActions = isActionList(actions)
    ? actions.map((action) => {
        const Icon = action.icon;

        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-walnut)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-ember-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {Icon && <Icon className="h-4 w-4" />}
            {action.label}
          </button>
        );
      })
    : actions;

  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-line)] pb-5">
      <div className="max-w-3xl">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-gold)]">
          Management
        </p>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--color-walnut)] sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">{description}</p>}
      </div>
      {renderedActions && <div className="flex flex-wrap items-center gap-2.5">{renderedActions}</div>}
    </div>
  );
}
