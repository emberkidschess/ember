"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowUpRight, Star } from "lucide-react";
import { fadeUp } from "./animations";

export interface Coach {
  name: string;
  title: string;
  rating?: string;
  experience: string;
  description: string;
  image: string;
  speciality?: string;
  achievements?: string[];
}

interface CoachCardProps {
  coach: Coach;
  index?: number;
  variant?: "default" | "large";
  className?: string;
  onClick?: () => void;
}

/**
 * Shared Coach card used in HomeSections (MeetCoaches) and potentially
 * an upcoming dedicated coaches page.
 */
export default function CoachCard({ coach, index = 0, variant = "default", className = "", onClick }: CoachCardProps) {
  if (variant === "large") {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        onClick={onClick}
        className={`group bg-[var(--color-paper)] border border-[var(--color-line)] rounded-3xl overflow-hidden hover:shadow-[var(--shadow-card)] transition-all duration-500 ${className}`}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={coach.image}
            alt={coach.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-walnut)]/60 via-transparent to-transparent" />
          {coach.rating && (
            <div className="absolute bottom-4 left-4 bg-[var(--color-paper)]/95 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-[var(--color-gold)] text-[var(--color-gold)]" />
              <span className="text-xs font-bold text-[var(--color-walnut)]">{coach.rating}</span>
            </div>
          )}
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--color-walnut)] group-hover:text-[var(--color-ember)] transition-colors duration-200">
                {coach.name}
              </h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ember)] mt-0.5">
                {coach.title}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--color-muted)] opacity-0 group-hover:opacity-100 group-hover:text-[var(--color-ember)] transition-all duration-300 shrink-0 mt-1" />
          </div>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">{coach.description}</p>
          {coach.speciality && (
            <div className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-pine)] bg-[var(--color-pine)]/8 rounded-full px-3 py-1 inline-block mb-4">
              {coach.speciality}
            </div>
          )}
          {coach.achievements && coach.achievements.length > 0 && (
            <ul className="space-y-1.5 pt-4 border-t border-[var(--color-line)]">
              {coach.achievements.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-gold)] shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-[var(--color-line)]/60 text-[10px] text-[var(--color-muted)]/70 font-medium uppercase tracking-wider">
            {coach.experience} Coaching Experience
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onClick}
      className={`group flex flex-col cursor-pointer ${className}`}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
        <Image
          src={coach.image}
          alt={coach.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="h-full w-full object-cover object-top transition-all duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Text */}
      <div className="mt-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {coach.title}{coach.rating ? ` · ${coach.rating}` : ""}
          </p>
          <ArrowUpRight className="w-4 h-4 text-[var(--color-muted)] opacity-0 group-hover:opacity-100 group-hover:text-[var(--color-ember)] transition-all duration-300 transform translate-y-1 group-hover:translate-y-0" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-walnut)] mt-1 group-hover:text-[var(--color-ember)] transition-colors duration-200">
          {coach.name}
        </h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]/90 leading-relaxed flex-1">
          {coach.description}
        </p>
        <div className="mt-4 pt-3 border-t border-neutral-200/60 text-xs text-[var(--color-muted)]/70 font-medium">
          {coach.experience} Coaching Experience
        </div>
        <button className="mt-3 text-xs font-semibold text-[var(--color-ember)] hover:text-[var(--color-walnut)] transition-colors duration-200 flex items-center gap-1 group/btn">
          See Details
          <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
