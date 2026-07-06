"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Video } from "lucide-react";
import type { Testimonial } from "@/types";

interface VideoCardProps {
  item: Testimonial;
  className?: string;
}

export default function VideoCard({ item, className = "" }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error("Video play error:", error);
          setIsPlaying(false);
          setHasError(true);
        });
      }
    }
  };

  const handleVideoClick = () => {
    handlePlay();
  };

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div
      className={`relative h-full min-h-[420px] rounded-2xl overflow-hidden border border-[var(--color-line)]/20 hover:border-[var(--color-ember)]/40 transition-all duration-500 group flex flex-col justify-end ${className}`}
      role="article"
      aria-label={`Video testimonial from ${item.name}`}
    >
      <div className="pointer-events-none absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
        <Video className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
        Video story
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={item.videoUrl}
        poster={item.videoPosterUrl}
        preload="metadata"
        loop
        playsInline
        muted={false}
        className="w-full h-full object-cover cursor-pointer"
        onClick={handleVideoClick}
      />

      {/* Loading Spinner */}
      {isLoading && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <p className="text-white text-sm">Video unavailable</p>
        </div>
      )}

      {/* Pause Button - Only visible when playing */}
      {isPlaying && (
        <button
          onClick={handlePlay}
          className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-[0_16px_40px_-18px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-[var(--color-ember)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Pause video"
        >
          <Pause className="h-5 w-5 fill-white text-white" />
        </button>
      )}

      {/* Overlay - Hidden when playing */}
      {!isPlaying && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-walnut)]/40 via-transparent to-[var(--color-ember)]/10 opacity-60" />

          {/* Play Button */}
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto group/play focus-visible:outline-none"
            aria-label="Play video"
          >
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/35 bg-white/15 text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 group-hover/play:scale-105 group-hover/play:border-[var(--color-ember)] group-hover/play:bg-[var(--color-ember)] group-focus-visible/play:ring-2 group-focus-visible/play:ring-white/80">
              <span className="absolute inset-0 rounded-full border border-white/25 animate-ping opacity-40" aria-hidden="true" />
              <Play className="h-8 w-8 translate-x-0.5 fill-white text-white" strokeWidth={1.8} />
            </div>
          </button>

          {/* Quote and User Info */}
          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
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
    </div>
  );
}
