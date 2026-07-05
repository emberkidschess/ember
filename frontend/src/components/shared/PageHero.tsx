"use client";

import { motion } from "framer-motion";
import { fadeUp, stagger } from "./animations";

interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared hero header for interior pages (About, Prodigies, Contact, etc.)
 * Provides consistent top-of-page spacing and animation.
 */
export default function PageHero({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: PageHeroProps) {
  return (
    <div className={`text-center pt-32 md:pt-44 pb-12 md:pb-20 px-6 md:px-12 max-w-5xl mx-auto ${className}`}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="flex flex-col items-center"
      >
        {eyebrow && (
          <motion.span
            variants={fadeUp}
            className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] px-4 py-1.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-ember)] mb-6 inline-block"
          >
            {eyebrow}
          </motion.span>
        )}

        <motion.h1
          variants={fadeUp}
          className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl md:text-7xl text-[var(--color-walnut)] relative inline-block pb-3 leading-[1.1]"
        >
          {title}
          {/* Animated underline */}
          <svg
            className="absolute w-full h-4 -bottom-1 left-0 text-[var(--color-gold)]/60"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M0 5 Q 50 10 100 5"
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
            />
          </svg>
        </motion.h1>

        {description && (
          <motion.p
            variants={fadeUp}
            className="mt-8 text-lg md:text-xl text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed"
          >
            {description}
          </motion.p>
        )}

        {children && (
          <motion.div variants={fadeUp} className="mt-8">
            {children}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
