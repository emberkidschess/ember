"use client";

import { useState } from "react";
import { Quote } from "lucide-react";
import type { Testimonial } from "@/types";

interface TestimonialCardProps {
  item: Testimonial;
  className?: string;
}

export default function TestimonialCard({ item, className = "" }: TestimonialCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Determine media type
  const hasImage = !!item.imageUrl && !imageError;
  const hasInstagram = !!item.instagramUrl;

  return (
    <div
      className={`
        relative h-full min-h-[420px] rounded-2xl overflow-hidden 
        border border-[var(--color-line)]/20 
        hover:border-[var(--color-ember)]/40 
        transition-all duration-500 group flex flex-col justify-end
        ${className}
      `}
      role="article"
      aria-label={`Testimonial from ${item.name}`}
    >
      {/* Background Media */}
      {hasImage ? (
        <div className="absolute inset-0 z-0 bg-gray-800">
          <img
            src={item.imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-walnut)]/40 via-transparent to-[var(--color-ember)]/10 opacity-60" />
        </div>
      ) : hasInstagram ? (
        <div className="absolute inset-0 z-0 bg-gray-800">
          <img
            src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288892/chess-academy/hero.png"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-walnut)]/40 via-transparent to-[var(--color-ember)]/10 opacity-60" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-[var(--color-ivory)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-ivory)] to-[var(--color-paper)]" />
        </div>
      )}

      {/* Content Layout */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between h-full w-full backdrop-blur-[1px]">
        
        {/* Top: Quote Icon */}
        <div className="flex justify-end items-start mb-4">
          <div className={`${hasImage || hasInstagram ? 'text-white/10 group-hover:text-[var(--color-ember)]/30' : 'text-[var(--color-ember)]/10 group-hover:text-[var(--color-ember)]/20'} transition-colors duration-500 transform group-hover:scale-110`} aria-hidden="true">
            <Quote className="w-10 h-10 transform rotate-180" strokeWidth={1} />
          </div>
        </div>

        {/* Middle: Premium Typography Quote */}
        <blockquote className="mb-6 mt-auto">
          <p className={`font-[family-name:var(--font-playfair)] text-base sm:text-[17px] leading-relaxed tracking-wide italic font-medium opacity-95 group-hover:opacity-100 transition-opacity ${
            hasImage || hasInstagram ? 'text-white' : 'text-[var(--color-walnut)]'
          }`}>
            &ldquo;{item.quote}&rdquo;
          </p>
        </blockquote>

        {/* Bottom: User Info */}
        <div className={`pt-4 border-t ${hasImage || hasInstagram ? 'border-white/10' : 'border-[var(--color-line)]'}`}>
          <div>
            <h4 className={`font-bold text-sm sm:text-base tracking-tight mb-0.5 ${
              hasImage || hasInstagram ? 'text-white' : 'text-[var(--color-walnut)]'
            }`}>
              {item.name}
            </h4>
            <p className={`text-xs ${
              hasImage || hasInstagram ? 'text-white/70' : 'text-[var(--color-muted)]'
            }`}>
              {item.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
