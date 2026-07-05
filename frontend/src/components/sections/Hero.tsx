"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Users, Trophy, Globe } from "lucide-react";
import { useSiteConfig } from "@/lib/site";
import CountUp from "@/components/shared/CountUp";
import type { HeroProps } from "@/types";

const STATS = [
  { num: 5000, suffix: "+", label: "STUDENTS", icon: Users },
  { num: 500, suffix: "+", label: "ACHIEVEMENTS", icon: Trophy },
  { num: 20, suffix: "+", label: "COUNTRIES", icon: Globe },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

export default function Hero({ onOpenTrial }: HeroProps) {
  const { siteConfig } = useSiteConfig();
  const primaryCta = siteConfig?.primaryCta || { label: "Book Free Trial", href: "/contact" };
  const secondaryCta = siteConfig?.secondaryCta || { label: "Explore Curriculum", href: "/courses" };

  return (
    <section
      className="relative min-h-[100dvh] overflow-hidden bg-[#F7F1E8]"
      aria-label="Hero section"
    >
      {/* Background Image */}
      <Image
        src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288892/chess-academy/hero.png"
        alt="Young chess player at EmberKids Academy"
        fill
        priority
        className="object-cover object-[75%_center] lg:object-[80%_center]"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#F7F1E8] via-[#F7F1E8]/90 to-[#F7F1E8]/10 z-0 lg:hidden" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#F7F1E8] via-transparent to-[#F7F1E8]/40 z-0 mix-blend-multiply opacity-60 lg:hidden" />

      {/* Subtle chess piece watermark (desktop only) */}
      <div className="hidden lg:block absolute top-12 right-[38%] text-[320px] text-[#1D1A17] opacity-[0.015] pointer-events-none select-none leading-none z-0">
        ♔
      </div>

      {/* Main container */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-8xl flex-col px-5 pb-8 pt-[116px] sm:px-10 sm:pb-12 sm:pt-[15dvh] md:px-16 lg:px-24">

        {/* Headline */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex-1 flex flex-col justify-center items-start text-left max-w-3xl w-full"
        >
          <h1 className="font-[family-name:var(--font-playfair)] flex flex-col gap-2 sm:gap-4 lg:gap-5 w-full">
            <motion.span
              variants={itemVariants}
              className="block text-xl sm:text-3xl text-[#7A7067] italic font-light lg:ml-6"
            >
              Every
            </motion.span>
            <motion.span
              variants={itemVariants}
              className="relative inline-block max-w-full text-[clamp(3rem,15vw,6.5rem)] leading-[0.86] font-black text-[#1D1A17] tracking-[-0.07em] drop-shadow-sm"
            >
              Grandmaster
            </motion.span>
            <motion.span
              variants={itemVariants}
              className="block text-2xl sm:text-4xl text-[#2C2723] font-medium tracking-tight mt-2 lg:ml-20"
            >
              was once a kid who
            </motion.span>
            <motion.span
              variants={itemVariants}
              className="block text-3xl sm:text-5xl lg:text-6xl italic text-[#D86B45] font-black lg:ml-32 drop-shadow-md"
            >
              refused to resign.
            </motion.span>
          </h1>

          <motion.p
            variants={itemVariants}
            className="mt-7 max-w-[34rem] text-base font-medium leading-relaxed text-[#4A433E] opacity-90 sm:mt-8 sm:text-xl lg:ml-6 lg:max-w-2xl"
          >
            EmberKids teaches children to think three moves ahead. A structured curriculum
            that develops focus, confidence, and strategic thinking.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-4 sm:gap-6 lg:ml-6 w-full sm:w-auto"
          >
            <button
              onClick={onOpenTrial}
              className="group relative flex items-center justify-center gap-3 bg-gradient-to-r from-[#D86B45] to-[#E67853] text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold uppercase tracking-[0.15em] text-sm transition-all duration-500 shadow-[0_0_40px_-10px_rgba(216,107,69,0.5)] hover:shadow-[0_0_60px_-10px_rgba(216,107,69,0.7)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden ring-1 ring-white/20"
            >
              <span className="relative z-10 flex items-center gap-2">
                {primaryCta.label}
                <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>
              {/* Shine sweep */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out" />
            </button>

            <Link
              href={secondaryCta.href}
              className="flex items-center justify-center gap-2 bg-transparent border-2 border-[#1D1A17]/20 text-[#1D1A17] px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold uppercase tracking-[0.15em] text-sm hover:border-[#D86B45] hover:text-[#D86B45] hover:bg-white/50 transition-all duration-300 w-full sm:w-auto"
            >
              {secondaryCta.label}
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUpVariant}
          className="mx-auto mt-auto flex w-full max-w-4xl flex-row justify-center gap-4 border-t border-[#1D1A17]/10 pt-8 min-[420px]:gap-8 sm:gap-20 sm:pt-14 lg:gap-32"
        >
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-none">
                <div className="flex items-center gap-2 sm:gap-3 text-[#D86B45]">
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={2.5} />
                  <span className="text-2xl sm:text-4xl font-black text-[#1D1A17] leading-none tracking-tight">
                    <CountUp end={stat.num} suffix={stat.suffix} />
                  </span>
                </div>
                <span className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-[#7A7067] sm:text-xs sm:tracking-[0.25em]">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
