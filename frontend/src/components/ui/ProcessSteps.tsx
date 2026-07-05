"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";

interface Step {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  text: string;
}

interface ProcessStepsProps {
  steps: Step[];
  className?: string;
}

export default function ProcessSteps({ steps, className = "" }: ProcessStepsProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={stagger}
      className={`grid md:grid-cols-2 lg:grid-cols-4 gap-8 ${className}`}
    >
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <motion.div
            key={index}
            variants={fadeUp}
            className="relative"
          >
            <div className="bg-[var(--color-ivory)] rounded-2xl border border-[var(--color-line)] p-8 h-full">
              <div className="w-12 h-12 bg-[var(--color-ember)] rounded-xl flex items-center justify-center mb-6">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-ember)] mb-2 block">
                {step.eyebrow}
              </span>
              <h3 className="font-bold text-xl mb-3">{step.title}</h3>
              <p className="text-[var(--color-muted)] leading-relaxed text-sm">{step.text}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-[var(--color-line)]" />
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
