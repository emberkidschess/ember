"use client";

import { useEffect, useState, useRef } from "react";
import type { Testimonial } from "@/types";

interface InstagramVideoCardProps {
  item: Testimonial;
  className?: string;
}

export default function InstagramVideoCard({ item, className = "" }: InstagramVideoCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Extract Instagram post/reel ID from URL
  const getInstagramId = (url: string) => {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const match = cleanUrl.match(/(?:\/p\/|\/reel\/)([\w-]+)/);
    return match ? match[1] : null;
  };

  const isReel = item.instagramUrl?.includes('/reel/');
  const instagramId = item.instagramUrl ? getInstagramId(item.instagramUrl) : null;
  const embedUrl = instagramId
    ? `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${instagramId}/embed`
    : null;

  // Load Instagram embed script with timeout
  useEffect(() => {
    const loadScript = () => {
      if (typeof window === 'undefined' || document.querySelector('script[src="https://www.instagram.com/embed.js"]')) {
        setIsLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      
      const timeout = setTimeout(() => {
        setHasError(true);
        setIsLoading(false);
      }, 8000); // 8 second timeout for Instagram script

      script.onload = () => {
        clearTimeout(timeout);
        setIsLoading(false);
        if (typeof window !== 'undefined' && (window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        setHasError(true);
        setIsLoading(false);
      };
      
      document.body.appendChild(script);
    };

    loadScript();
  }, []);

  if (!embedUrl) {
    return (
      <div className={`relative h-full min-h-[420px] rounded-2xl overflow-hidden bg-gray-800 ${className}`} role="alert" aria-live="polite">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-white/60">Invalid Instagram URL</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`relative h-full min-h-[420px] rounded-2xl overflow-hidden bg-gray-800 ${className}`} role="alert" aria-live="assertive">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-white/60 mb-4">Unable to load Instagram video</p>
          <a
            href={item.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-ember)] hover:text-white transition-colors text-sm"
            aria-label={`View ${item.name}'s testimonial on Instagram`}
          >
            View on Instagram
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`relative h-full min-h-[420px] rounded-2xl overflow-hidden border border-[var(--color-line)]/20 hover:border-[var(--color-ember)]/40 transition-all duration-500 group flex flex-col justify-end ${className}`}
      role="article"
      aria-label={`Instagram testimonial from ${item.name}`}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-gray-800">
          <img
            src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288892/chess-academy/hero.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-walnut)]/40 via-transparent to-[var(--color-ember)]/10 opacity-60" />
          
          {/* Instagram Badge */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span className="text-xs font-medium text-white">Instagram</span>
          </div>

          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="w-8 h-8 border-2 border-[var(--color-ember)] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          </div>

          {/* Quote and User Info */}
          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end z-20 pointer-events-none">
            <blockquote className="mb-6">
              <p className="font-[family-name:var(--font-playfair)] text-white text-base sm:text-[17px] leading-relaxed tracking-wide italic font-medium opacity-95">
                &ldquo;{item.quote}&rdquo;
              </p>
            </blockquote>

            <div className="pt-4 border-t border-white/10">
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base tracking-tight mb-0.5">
                  {item.name}
                </h4>
                <p className="text-xs text-white/70">
                  {item.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instagram Embed */}
      {!isLoading && (
        <div className="absolute inset-0 z-20 bg-white overflow-hidden" aria-hidden="true">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={item.instagramUrl}
            data-instgrm-version="14"
            style={{
              background: '#FFF',
              border: '0',
              borderRadius: '0',
              boxShadow: 'none',
              margin: '0',
              maxWidth: '100%',
              minWidth: '100%',
              padding: '0',
              width: '100%',
              height: '100%',
              minHeight: '100%',
            }}
          />
        </div>
      )}
    </div>
  );
}
