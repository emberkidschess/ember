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
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-walnut)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-walnut)]/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {Icon && <Icon className="h-4 w-4" />}
            {action.label}
          </button>
        );
      })
    : actions;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-walnut)] font-[family-name:var(--font-playfair)]">
          {title}
        </h1>
        {description && <p className="text-sm text-[var(--color-muted)] mt-1">{description}</p>}
      </div>
      {renderedActions && <div className="flex items-center gap-2.5">{renderedActions}</div>}
    </div>
  );
}
