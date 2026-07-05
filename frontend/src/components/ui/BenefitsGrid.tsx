"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface BenefitsGridProps {
  benefits: Benefit[];
  className?: string;
}

export default function BenefitsGrid({ benefits, className = "" }: BenefitsGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={stagger}
      className={`grid md:grid-cols-2 lg:grid-cols-4 gap-8 ${className}`}
    >
      {benefits.map((benefit, index) => {
        const Icon = benefit.icon;
        return (
          <motion.div
            key={index}
            variants={fadeUp}
            className="bg-[var(--color-ivory)] rounded-2xl border border-[var(--color-line)] p-8 hover:shadow-lg hover:border-[var(--color-ember)]/20 transition-all duration-500 group text-center"
          >
            <div className="w-16 h-16 bg-[var(--color-ember)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[var(--color-ember)]/20 transition-colors duration-300">
              <Icon className="w-8 h-8 text-[var(--color-ember)]" />
            </div>
            <h3 className="font-bold text-xl text-[var(--color-walnut)] mb-3">
              {benefit.title}
            </h3>
            <p className="text-[var(--color-muted)] leading-relaxed text-sm">
              {benefit.description}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
