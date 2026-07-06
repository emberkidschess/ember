"use client";

import { ArrowUpRight, Quote } from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import type { Testimonial } from "@/types";

interface InstagramVideoCardProps {
  item: Testimonial;
  className?: string;
}

export default function InstagramVideoCard({ item, className = "" }: InstagramVideoCardProps) {
  const instagramUrl = item.instagramUrl || "https://www.instagram.com/emberkidsofficial";

  return (
    <article
      className={`
        relative h-full min-h-[420px] overflow-hidden rounded-2xl
        border border-[var(--color-line)]/20 bg-gray-900
        transition-all duration-500 hover:border-[var(--color-ember)]/40
        group flex flex-col justify-end
        ${className}
      `}
      aria-label={`Instagram testimonial from ${item.name}`}
    >
      <div className="absolute inset-0 z-0">
        <img
          src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288892/chess-academy/hero.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/35 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-walnut)]/35 via-transparent to-[var(--color-ember)]/20 opacity-70" />
      </div>

      <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
        <FaInstagram className="h-4 w-4" aria-hidden="true" />
        Instagram
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
        <div className="flex justify-end">
          <Quote className="h-10 w-10 rotate-180 text-white/10 transition-colors duration-500 group-hover:text-[var(--color-ember)]/30" strokeWidth={1} aria-hidden="true" />
        </div>

        <div>
          <blockquote className="mb-6">
            <p className="font-[family-name:var(--font-playfair)] text-base font-medium italic leading-relaxed tracking-wide text-white opacity-95 sm:text-[17px]">
              &ldquo;{item.quote}&rdquo;
            </p>
          </blockquote>

          <div className="border-t border-white/10 pt-4">
            <h4 className="mb-0.5 text-sm font-bold tracking-tight text-white sm:text-base">
              {item.name}
            </h4>
            <p className="text-xs text-white/70">{item.role}</p>
          </div>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-walnut)] transition-all duration-300 hover:bg-[var(--color-ember)] hover:text-white"
            aria-label={`Open ${item.name}'s testimonial on Instagram`}
          >
            Watch on Instagram
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
