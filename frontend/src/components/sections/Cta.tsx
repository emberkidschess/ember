"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";
import { useState, MouseEvent } from "react";
import BookFreeTrial from "../modals/BookFreeTrial";
import type { CtaProps } from "@/types";

export default function Cta({
  title,
  description,
  buttonText,
  buttonHref,
  onButtonClick,
  className = "",
}: CtaProps) {
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  
  // Spotlight tracker
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const isBookFreeTrial =
    buttonText?.toLowerCase().includes("book") &&
    (buttonText?.toLowerCase().includes("free") ||
      buttonText?.toLowerCase().includes("assessment") ||
      buttonText?.toLowerCase().includes("trial"));

  const handleButtonClick = () => {
    if (isBookFreeTrial) {
      setIsTrialModalOpen(true);
    } else if (onButtonClick) {
      onButtonClick();
    }
  };

  const buttonContent = (
    <>
      <span className="relative z-10">{buttonText}</span>
      <motion.div
        variants={{
          initial: { x: 0, y: 0 },
          hover: { x: 2, y: -2 }
        }}
        transition={{ type: "spring", stiffness: 400, damping: 12 }}
        className="relative z-10"
      >
        <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
      </motion.div>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-out" />
    </>
  );

  return (
    <section className={`py-12 md:py-20 px-4 md:px-8 relative overflow-hidden ${className}`}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={stagger}
        className="max-w-6xl mx-auto"
      >
        <motion.div
          variants={fadeUp}
          onMouseMove={handleMouseMove}
          className="group/card relative overflow-hidden rounded-xl md:rounded-2xl border border-line/40 bg-walnut text-paper"
        >
          {/* Responsive Spotlight Glow */}
          <motion.div
            className="pointer-events-none absolute -inset-px opacity-0 group-hover/card:opacity-100 transition duration-500 z-0"
            style={{
              background: useMotionTemplate`
                radial-gradient(
                  500px circle at ${mouseX}px ${mouseY}px,
                  rgba(235, 94, 40, 0.1),
                  transparent 80%
                )
              `,
            }}
          />

          {/* Dynamic Padding: Mobile par tight, Desktop par visually wide */}
          <div className="relative px-6 py-10 md:px-16 md:py-16 xl:py-20 overflow-hidden">
            
            {/* SVG Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
                    <path d="M 44 0 L 0 0 0 44" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-4 left-4 w-4 h-4 md:top-6 md:left-6 md:w-6 md:h-6 border-l border-t border-ember/20 rounded-tl transition-all duration-300 group-hover/card:border-ember/40" />
            <div className="absolute top-4 right-4 w-4 h-4 md:top-6 md:right-6 md:w-6 md:h-6 border-r border-t border-ember/20 rounded-tr transition-all duration-300 group-hover/card:border-ember/40" />
            <div className="absolute bottom-4 left-4 w-4 h-4 md:bottom-6 md:left-6 md:w-6 md:h-6 border-l border-b border-ember/20 rounded-bl transition-all duration-300 group-hover/card:border-ember/40" />
            <div className="absolute bottom-4 right-4 w-4 h-4 md:bottom-6 md:right-6 md:w-6 md:h-6 border-r border-b border-ember/20 rounded-br transition-all duration-300 group-hover/card:border-ember/40" />

            {/* Layout Content */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-16">
              <div className="max-w-2xl space-y-3 md:space-y-4">
                <div className="inline-flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-ember" />
                  <p className="uppercase tracking-[0.3em] text-[10px] md:text-xs font-medium text-paper/40">
                    The Next Move Is Yours
                  </p>
                </div>

                {/* Typography fluid scale */}
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.15] text-balance">
                  {title}
                </h2>

                {description && (
                  <p className="text-paper/60 text-sm md:text-base lg:text-lg max-w-xl leading-relaxed text-pretty font-light">
                    {description}
                  </p>
                )}
              </div>

              {/* Responsive Button sizing */}
              <div className="shrink-0">
                <motion.div 
                  initial="initial"
                  whileHover="hover"
                  className="w-full sm:w-auto"
                >
                  {buttonHref && !isBookFreeTrial ? (
                    <Link
                      href={buttonHref}
                      className="
                        group inline-flex items-center justify-center gap-2 w-full sm:w-auto 
                        px-6 py-3 md:px-8 md:py-4 rounded-xl bg-paper text-walnut 
                        text-sm md:text-base font-medium shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden
                      "
                    >
                      {buttonContent}
                    </Link>
                  ) : (
                    <button
                      onClick={handleButtonClick}
                      className="
                        group inline-flex items-center justify-center gap-2 w-full sm:w-auto 
                        px-6 py-3 md:px-8 md:py-4 rounded-xl bg-paper text-walnut 
                        text-sm md:text-base font-medium shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden cursor-pointer
                      "
                    >
                      {buttonContent}
                    </button>
                  )}
                </motion.div>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>

      {isBookFreeTrial && (
        <BookFreeTrial isOpen={isTrialModalOpen} onClose={() => setIsTrialModalOpen(false)} />
      )}
    </section>
  );
}