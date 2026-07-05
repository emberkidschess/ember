"use client";

import { motion } from "framer-motion";
import { fadeUp, stagger, viewportConfig } from "./animations";
import CountUp from "./CountUp";
import type { LucideIcon } from "lucide-react";

export interface Stat {
  num?: number;
  label: string;
  suffix?: string;
  prefix?: string;
  textValue?: string; // for non-numeric values like "1:1"
  icon?: LucideIcon;
  textClass?: string;
}

interface StatsRowProps {
  stats: Stat[];
  className?: string;
  bordered?: boolean;
}

/**
 * Shared animated stats/social-proof row used in About, Hero, and Prodigies pages.
 */
export default function StatsRow({ stats, className = "", bordered = true }: StatsRowProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      className={`
        grid grid-cols-2 md:grid-cols-4 gap-6 text-center
        ${bordered ? "border-y border-[var(--color-line)] py-10 divide-x divide-[var(--color-line-strong)]" : ""}
        ${className}
      `}
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={i}
            variants={fadeUp}
            className="px-4 flex flex-col items-center justify-center"
          >
            {Icon && <Icon className="w-6 h-6 text-[var(--color-ember)] mb-3" />}
            <h3 className={`text-3xl md:text-5xl font-[family-name:var(--font-playfair)] mb-2 ${stat.textClass || "text-[var(--color-walnut)]"}`}>
              {stat.textValue ? (
                stat.textValue
              ) : stat.num !== undefined ? (
                <CountUp end={stat.num} suffix={stat.suffix} prefix={stat.prefix} />
              ) : null}
            </h3>
            <p className="mt-1 text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--color-walnut-soft)]">
              {stat.label}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
