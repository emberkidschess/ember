"use client";

import { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  text: string;
}

interface FeatureListProps {
  features: Feature[];
  className?: string;
}

export default function FeatureList({ features, className = "" }: FeatureListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {features.map((feature, i) => {
        const Icon = feature.icon;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-ember)]/20 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-[var(--color-ember)]" />
            </div>
            <span className="text-base font-medium">{feature.text}</span>
          </div>
        );
      })}
    </div>
  );
}
