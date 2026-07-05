"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";

interface TeamMember {
  name: string;
  title: string;
  rating?: string;
  experience?: string;
  description: string;
  image?: string;
  icon?: LucideIcon;
}

interface TeamGridProps {
  members: TeamMember[];
  className?: string;
}

export default function TeamGrid({ members, className = "" }: TeamGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={stagger}
      className={`grid md:grid-cols-3 gap-8 ${className}`}
    >
      {members.map((member, index) => {
        const Icon = member.icon;
        return (
          <motion.div
            key={index}
            variants={fadeUp}
            className="group bg-[var(--color-ivory)] rounded-2xl border border-[var(--color-line)] overflow-hidden hover:shadow-xl hover:border-[var(--color-ember)]/30 transition-all duration-500"
          >
            {member.image ? (
              <div className="aspect-[4/5] bg-gradient-to-br from-[var(--color-ivory-deep)] to-[var(--color-ivory)] relative overflow-hidden">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(max-w-640px) 100vw, (max-w-1024px) 50vw, 400px"
                  quality={92}
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="aspect-[4/5] bg-gradient-to-br from-[var(--color-ivory-deep)] to-[var(--color-ivory)] relative overflow-hidden flex items-center justify-center">
                {Icon && <Icon className="w-24 h-24 text-[var(--color-ember)]/20 group-hover:text-[var(--color-ember)]/30 transition-colors duration-500" />}
              </div>
            )}
            <div className="p-6">
              <h3 className="font-bold text-xl text-[var(--color-walnut)] mb-1">{member.name}</h3>
              <p className="text-sm font-bold text-[var(--color-ember)] mb-3">{member.title}</p>
              {member.rating && member.experience && (
                <div className="flex gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-[var(--color-muted)]">Rating</p>
                    <p className="text-sm font-bold text-[var(--color-walnut)]">{member.rating}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--color-muted)]">Experience</p>
                    <p className="text-sm font-bold text-[var(--color-walnut)]">{member.experience}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{member.description}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
