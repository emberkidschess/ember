"use client";

import { useEffect } from "react";
import { X, Star, Award, Clock, Target, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import type { Coach } from "./CoachCard";

interface CoachModalProps {
  coach: Coach | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CoachModal({ coach, isOpen, onClose }: CoachModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !coach) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-white/10 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Card - Maximum height reduced to 80vh to stay well within viewport */}
      <div className="relative top-10 bg-white rounded-2xl max-w-lg sm:max-w-xl md:max-w-2xl  w-full max-h-[80vh]  flex flex-col overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* Compact Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-sm group"
          aria-label="Close modal"
        >
          <X className="w-4 h-4 text-gray-600 group-hover:text-black" />
        </button>

        {/* Reduced Height Image Header */}
        <div className="relative h-80 sm:h-80 md:h-80 w-full overflow-hidden shrink-0">
          <Image
            src={coach.image}
            alt={coach.name}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover object-[50%_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20" />
          
          {coach.rating && (
            <div className="absolute bottom-3 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-md border border-gray-100">
              <Star className="w-3.5 h-3.5 fill-[var(--color-gold)] text-[var(--color-gold)]" />
              <span className="text-xs font-bold text-gray-900">{coach.rating}</span>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:p-6 custom-scrollbar">
          
          {/* Header Info */}
          <div className="mb-4 border-b border-gray-100 pb-4">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-1">
              {coach.name}
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ember)] mb-2.5">
              {coach.title}
            </p>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                <Clock className="w-3.5 h-3.5 text-[var(--color-ember)]" />
                <span>{coach.experience}</span>
              </div>
              {coach.speciality && (
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                  <Target className="w-3.5 h-3.5 text-[var(--color-ember)]" />
                  <span>{coach.speciality}</span>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-1.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[var(--color-ember)]" />
              About
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {coach.description}
            </p>
          </div>

          {/* Achievements */}
          {coach.achievements && coach.achievements.length > 0 && (
            <div className="mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-[var(--color-ember)]" />
                Key Achievements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {coach.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2.5 bg-gray-50/60 rounded-lg border border-gray-100"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] shrink-0 mt-1.5" />
                    <span className="text-xs text-gray-700 font-medium leading-normal">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="p-3 bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 font-medium text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Verified Coach • {coach.experience} Experience</span>
          </div>
        </div>
      </div>
    </div>
  );
}