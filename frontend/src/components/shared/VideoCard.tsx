"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
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
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-black/70 transition-all duration-300"
          aria-label="Pause video"
        >
          <Pause className="w-5 h-5 text-white" />
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
            className="absolute inset-0 flex items-center justify-center pointer-events-auto group/play"
            aria-label="Play video"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-[var(--color-ember)] hover:border-[var(--color-ember)] hover:scale-110 transition-all duration-300">
              <Play className="w-8 h-8 text-white fill-white translate-x-1" />
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
