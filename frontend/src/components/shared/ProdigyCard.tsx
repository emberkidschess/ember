"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Crown, Medal } from "lucide-react";
import { fadeUp } from "./animations";
import LaurelWreath from "./LaurelWreath";
import type { Prodigy } from "@/types";

interface ProdigyCardProps {
  student: Prodigy;
  className?: string;
  /** 1-3 renders a gold/silver/bronze leaderboard badge. Omit for a plain card. */
  rank?: number;
}

const RANK_STYLES: Record<number, { ring: string; badgeBg: string; badgeText: string }> = {
  2: { ring: "group-hover:border-[#9CA8AF]", badgeBg: "bg-[#B9C2C9]", badgeText: "text-white" },
  3: { ring: "group-hover:border-[#C08A54]", badgeBg: "bg-[#C08A54]", badgeText: "text-white" },
};

/**
 * Shared card for displaying a prodigy/rising-star student.
 * Used in both HomeSections (RisingStars) and the Prodigies page.
 * Pass `rank` (1-3) on the Prodigies page to show a leaderboard medal.
 */
export default function ProdigyCard({ student, className = "", rank }: ProdigyCardProps) {
  const isChampion = rank === 1;
  const medalStyle = rank && rank >= 2 ? RANK_STYLES[rank] : undefined;

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: "easeOut" } }}
      className={`
        bg-[var(--color-paper)] border border-[var(--color-line)] p-5 rounded-2xl
        flex flex-col justify-between hover:shadow-[var(--shadow-card)]
        transition-all duration-300 relative group
        ${className}
      `}
    >
      {/* Age badge */}
      <div className="flex justify-end mb-4">
        <span className="text-[10px] font-mono text-[var(--color-muted)] font-bold tracking-wider uppercase">
          {student.age}
        </span>
      </div>

      {/* Image */}
      <div
        className={`w-full aspect-[4/3] bg-[var(--color-ivory)] border border-[var(--color-line)] rounded-xl mb-4 relative overflow-hidden transition-colors duration-300 ${
          isChampion ? "group-hover:border-[var(--color-gold)]" : medalStyle?.ring ?? "group-hover:border-[var(--color-gold)]"
        }`}
      >
        <Image
          src={student.image}
          alt={student.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          quality={92}
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />

        {/* Rank 1 — laurel medallion with crown */}
        {isChampion && (
          <div className="absolute -top-2.5 -left-2.5 w-14 h-14 drop-shadow-md">
            <LaurelWreath className="absolute inset-0 w-full h-full" />
            <Crown className="absolute inset-0 m-auto w-5 h-5 text-[var(--color-gold)] translate-y-[1px]" strokeWidth={2.25} />
          </div>
        )}

        {/* Rank 2/3 — simple medal badge */}
        {medalStyle && (
          <div
            className={`absolute top-2.5 left-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${medalStyle.badgeBg} ${medalStyle.badgeText}`}
          >
            <Medal className="w-4 h-4" strokeWidth={2.25} />
          </div>
        )}
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--color-walnut)] group-hover:text-[var(--color-ember)] transition-colors duration-200 mb-1">
          {student.name}
        </h3>
        <p className="text-[10px] font-bold text-[var(--color-gold)] uppercase tracking-wider mb-3">
          {student.milestone}
        </p>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">
          {student.snippet}
        </p>
      </div>
    </motion.div>
  );
}
