"use client";

import { Star } from "lucide-react";

interface AdvantageListProps {
  advantages: string[];
  className?: string;
}

export default function AdvantageList({ advantages, className = "" }: AdvantageListProps) {
  return (
    <div className={`space-y-7 ${className}`}>
      {advantages.map((text, i) => (
        <div key={i} className="flex gap-4 items-start group">
          <div className="w-8 h-8 rounded-full bg-[var(--color-paper)] shadow-sm border border-[var(--color-line)] flex items-center justify-center shrink-0 mt-0.5 group-hover:-translate-y-1 group-hover:shadow-md transition-all duration-300">
            <Star className="w-3.5 h-3.5 text-[var(--color-gold)] fill-[var(--color-gold)]" />
          </div>
          <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed pt-1">
            {text}
          </p>
        </div>
      ))}
    </div>
  );
}
