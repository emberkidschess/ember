"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";

interface Card {
  name: string;
  subtitle?: string;
  badge?: string;
  description: string;
  image: string;
}

interface CardGridProps {
  cards: Card[];
  className?: string;
}

export default function CardGrid({ cards, className = "" }: CardGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={stagger}
      className={`grid md:grid-cols-3 gap-8 ${className}`}
    >
      {cards.map((card, index) => (
        <motion.div
          key={index}
          variants={fadeUp}
          className="group bg-white rounded-2xl border border-[var(--color-line)] overflow-hidden hover:shadow-xl hover:border-[var(--color-ember)]/30 transition-all duration-500"
        >
          <div className="aspect-[4/3] bg-[var(--color-ivory)] relative overflow-hidden">
            <Image
              src={card.image}
              alt={card.name}
              fill
              sizes="(max-w-640px) 100vw, (max-w-1024px) 50vw, 400px"
              quality={92}
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-[var(--color-walnut)]">{card.name}</h3>
              {card.subtitle && (
                <span className="text-xs font-medium text-[var(--color-muted)]">{card.subtitle}</span>
              )}
            </div>
            {card.badge && (
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-ember)]">
                  {card.badge}
                </span>
              </div>
            )}
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">{card.description}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
