"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { viewportConfig } from "../shared/animations";

interface Milestone {
  phase: string;
  title: string;
  rating: string;
  outcome: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

interface TimelineProps {
  milestones: Milestone[];
  className?: string;
}

export default function Timeline({ milestones, className = "" }: TimelineProps) {
  return (
    <div className={`relative max-w-4xl mx-auto pl-8 md:pl-0 ${className}`}>
      <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--color-gold)]/40 via-[var(--color-ember)]/30 to-transparent transform md:-translate-x-1/2" />

      <div className="space-y-12">
        {milestones.map((milestone, idx) => {
          const IconComponent = milestone.icon;
          const isEven = idx % 2 === 0;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: isEven ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={viewportConfig}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className={`flex flex-col md:flex-row items-start md:items-center justify-between relative w-full ${
                isEven ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="absolute left-[-4px] md:left-1/2 top-1.5 md:top-1/2 transform -translate-x-1/2 md:-translate-y-1/2 z-20">
                <div className="w-8 h-8 rounded-full bg-[var(--color-paper)] border-2 border-[var(--color-gold)] flex items-center justify-center shadow-sm">
                  <IconComponent className={`w-4 h-4 ${milestone.color}`} />
                </div>
              </div>

              <div className="w-full md:w-[44%] bg-[var(--color-paper)] p-6 rounded-2xl border border-[var(--color-line)] shadow-xs hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs font-bold text-[var(--color-ember)] uppercase tracking-wider">
                    {milestone.phase}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${milestone.bg} ${milestone.color}`}
                  >
                    {milestone.rating}
                  </span>
                </div>
                <h4 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--color-walnut)] mb-2">
                  {milestone.title}
                </h4>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  {milestone.outcome}
                </p>
              </div>

              <div className="hidden md:block w-[44%]" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
