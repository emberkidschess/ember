"use client";

import { motion } from "framer-motion";
import { fadeUp, stagger, viewportConfig } from "./animations";

interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
  /** If true, animates on mount (used for hero/page headings). Default: whileInView */
  animateOnMount?: boolean;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
  animateOnMount = false,
}: SectionHeaderProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  const motionProps = animateOnMount
    ? { initial: "hidden", animate: "visible" }
    : { initial: "hidden", whileInView: "visible", viewport: viewportConfig };

  return (
    <motion.div
      variants={stagger}
      {...motionProps}
      className={`max-w-3xl ${alignClass} ${className}`}
    >
      {eyebrow && (
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-ember)] mb-4 block"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ember)] inline-block" />
          {eyebrow}
        </motion.span>
      )}
      <motion.h2
        variants={fadeUp}
        className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl md:text-5xl leading-[1.1] text-[var(--color-walnut)] font-medium"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          variants={fadeUp}
          className="mt-5 text-base md:text-lg text-[var(--color-muted)] leading-relaxed"
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
