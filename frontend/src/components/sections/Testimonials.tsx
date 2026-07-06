"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";
import SectionHeader from "../shared/SectionHeader";
import GridBackground from "../shared/GridBackground";
import TestimonialCard from "../shared/TestimonialCard";
import InstagramVideoCard from "../shared/InstagramVideoCard";
import VideoCard from "../shared/VideoCard";
import { useTestimonials } from "@/lib/api";

function TestimonialSkeleton() {
  return (
    <div className="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]">
      <div className="absolute inset-0 bg-gradient-to-t from-gray-200 to-gray-100 animate-pulse" />
      <div className="relative z-10 p-6 flex flex-col justify-between h-full">
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse ml-auto" />
        <div className="space-y-3 mt-auto">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="w-full text-center py-12 px-4" role="alert">
      <p className="text-gray-600 font-medium text-sm">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 px-4 py-1.5 bg-[var(--color-ember)] text-white rounded-lg text-xs font-medium"
      >
        Retry
      </button>
    </div>
  );
}

export default function Testimonials() {
  const { data, isLoading, error } = useTestimonials();
  const scrollContainer = useRef<HTMLDivElement>(null);

  const testimonialsArray = data?.testimonials || [];
  const displayTestimonials = testimonialsArray.slice(0, 6);
  const hasData = displayTestimonials.length > 0;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainer.current) {
      const firstCard = scrollContainer.current.firstElementChild as HTMLElement;
      const stepWidth = firstCard ? firstCard.offsetWidth : scrollContainer.current.clientWidth;
      const gap = 16; 
      
      const scrollAmount = direction === 'left' ? -(stepWidth + gap) : (stepWidth + gap);
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden bg-[var(--color-paper)] py-16 sm:py-24 lg:py-32" aria-label="Testimonials">
      <GridBackground variant="dot" opacity={0.025} size={36} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={stagger}
          className="mb-12 sm:mb-20 text-center max-w-3xl mx-auto"
        >
          <SectionHeader
            eyebrow="Elite Testimonials"
            title={
              <>
                Trusted by Strategic{" "}
                <span className="italic font-serif text-[var(--color-ember)]">Families</span>
              </>
            }
            description="See why hundreds of parents trust EmberKids Academy to develop their children's chess skills."
          />
        </motion.div>

        {/* Dynamic Horizontal Track Panel */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="relative group min-h-[420px]"
        >
          {isLoading ? (
            <div className="flex flex-nowrap gap-4 overflow-x-hidden snap-x snap-mandatory py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <TestimonialSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          ) : error ? (
            <ErrorMessage message="Unable to load testimonials." />
          ) : !hasData ? (
            <ErrorMessage message="No testimonials available." />
          ) : (
            <>
              {/* Left Action Trigger */}
              <button
                onClick={() => scroll('left')}
                className="absolute inset-y-0 left-2 my-auto z-30 w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white active:scale-95 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>

              {/* THE CAROUSEL TRACK */}
              <div
                ref={scrollContainer}
                className="flex flex-nowrap gap-4 overflow-x-auto snap-x snap-mandatory py-4 scrollbar-hide scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {displayTestimonials.map((item, index) => (
                  <motion.div 
                    key={`${item.name}-${index}`} 
                    variants={fadeUp} 
                    custom={index} 
                    /* Highly Responsive Width Breakdown:
                      - `w-full`: 1 card fully visible on mobile screens.
                      - `md:w-[calc(50%-8px)]`: 2 cards fully visible on medium screens.
                      - `lg:w-[calc(33.333%-11px)]`: Exactly 3 cards visible on large desktop setups and above.
                    */
                    className="snap-center flex-shrink-0 w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
                  >
                    {item.videoUrl ? (
                      <VideoCard item={item} className="h-full w-full" />
                    ) : item.instagramUrl ? (
                      <InstagramVideoCard item={item} className="h-full w-full" />
                    ) : (
                      <TestimonialCard item={item} className="h-full w-full" />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Right Action Trigger */}
              <button
                onClick={() => scroll('right')}
                className="absolute inset-y-0 right-2 my-auto z-30 w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white active:scale-95 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="mt-16 pt-10 border-t border-[var(--color-line)]/50"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex -space-x-2.5">
                {(hasData ? displayTestimonials : [{name: "E"}, {name: "K"}, {name: "A"}]).slice(0, 3).map((_, i) => (
                  <Avatar.Root key={i} className="w-9 h-9">
                    <Avatar.Image
                      src={`https://images.unsplash.com/photo-${[
                        '1507003211169-0a1dd7228f2d',
                        '1494790108377-be9c29b29330', 
                        '1500648767791-00dcc994a43e'
                      ][i]}`}
                      alt=""
                      className="w-9 h-9 rounded-full border-2 border-[var(--color-paper)] object-cover shadow-sm"
                    />
                    <Avatar.Fallback className="w-9 h-9 rounded-full bg-[var(--color-ember)] flex items-center justify-center text-white text-xs font-bold border-2 border-[var(--color-paper)]">
                      U
                    </Avatar.Fallback>
                  </Avatar.Root>
                ))}
                <div className="w-9 h-9 rounded-full bg-[var(--color-ember)] border-2 border-[var(--color-paper)] flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                  +5000
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-walnut)] tracking-tight">500+ Happy Families</p>
                <p className="text-xs text-[var(--color-muted)]">Across 20+ countries</p>
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-[var(--color-line)]/70" aria-hidden="true" />

            <div className="flex items-center gap-2">
              <div className="flex gap-0.5" aria-label="5 out of 5 stars rating">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-[var(--color-ember)] text-[var(--color-ember)]"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-[var(--color-walnut)] ml-1">4.9/5 Elite Rating</span>
            </div>
          </div>

          {/* View More on Instagram Button */}
          <div className="flex justify-center mt-8">
            <a
              href="https://www.instagram.com/emberkidsofficial?igsh=N29kNjloamYzeGpr&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[var(--color-line)]/30 text-[var(--color-walnut)] rounded-full text-sm font-semibold hover:border-[var(--color-ember)] hover:text-[var(--color-ember)] hover:shadow-md transition-all duration-300 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              View More on Instagram
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}