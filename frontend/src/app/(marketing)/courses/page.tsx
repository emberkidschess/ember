"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, BrainCircuit, CheckCircle2, ChevronRight, Compass, Crown, Shield, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import Faq from "@/components/sections/Faq";
import Cta from "@/components/sections/Cta";
import PageHero from "@/components/shared/PageHero";
import SectionHeader from "@/components/shared/SectionHeader";
import GridBackground from "@/components/shared/GridBackground";
import { fadeUp, stagger, viewportConfig } from "@/components/shared/animations";
import type { Course, RoadmapIconName, RoadmapMilestone, RoadmapMilestoneDTO } from "@/types";
import { getCourses } from "@/lib/api";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const roadmapIconMap: Record<RoadmapIconName, RoadmapMilestone["icon"]> = { Compass, Shield, Zap, Crown };
const toMilestone = (m: RoadmapMilestoneDTO): RoadmapMilestone => ({ ...m, icon: roadmapIconMap[m.iconName] ?? Compass });

// ─── Fallback data ─────────────────────────────────────────────────────────────
const fallbackCourses: Course[] = [
  {
    level: "Level 01", title: "Beginner", subtitle: "The Logic Core",
    desc: "Perfect for absolute beginners. Build a rock-solid base by understanding the language and rules of chess.",
    topics: ["Piece Movement & Values", "Board Geometry & Notation", "Basic Checkmates", "Opening Principles"],
    accent: "border-blue-400", badgeColor: "bg-blue-50 text-blue-700",
  },
  {
    level: "Level 02", title: "Intermediate", subtitle: "Tactical Vision",
    desc: "Move beyond basic moves. Learn to identify patterns, create threats, and calculate short sequences.",
    topics: ["Tactical Motifs (Pins, Forks)", "Endgame Precision", "Positional Evaluation", "Calculation Training"],
    accent: "border-[var(--color-pine)]", badgeColor: "bg-green-50 text-[var(--color-pine)]",
  },
  {
    level: "Level 03", title: "Advanced", subtitle: "Strategic Mastery",
    desc: "Think like a master. Anticipate your opponent's plans and build long-term winning strategies.",
    topics: ["Prophylactic Thinking", "Complex Middlegame Plans", "Pawn Structure Nuances", "Candidate Moves"],
    accent: "border-[var(--color-ember)]", badgeColor: "bg-orange-50 text-[var(--color-ember)]",
  },
  {
    level: "Level 04", title: "Expert", subtitle: "Tournament Excellence",
    desc: "Elite training for competitive players aiming for state and national level dominance.",
    topics: ["Opening Repertoire Building", "GM Game Analysis", "Psychological Warfare", "Advanced Time Management"],
    accent: "border-[var(--color-gold)]", badgeColor: "bg-amber-50 text-amber-700", isPremium: true,
  },
];

const fallbackRoadmap: RoadmapMilestone[] = [
  { phase: "Month 1–3",       title: "The Awakening",      rating: "0–400 Elo",       outcome: "Student recognises tactical patterns instantly and plays games without illegal moves.",  icon: Compass, color: "text-blue-500",   bg: "bg-blue-500/5" },
  { phase: "Month 4–9",       title: "Tactical Sharpness", rating: "400–1000 Elo",    outcome: "Capable of calculating 3–4 moves ahead. Begins participating in local tournaments.",     icon: Shield,  color: "text-emerald-600", bg: "bg-emerald-600/5" },
  { phase: "Month 10–18",     title: "Strategic Dominance",rating: "1000–1400 Elo",   outcome: "Understands pawn structures, deep positional play, starts beating casual adult players.", icon: Zap,     color: "text-orange-500",  bg: "bg-orange-500/5" },
  { phase: "Beyond 18 Months",title: "The Rated Competitor",rating: "1400+ Rating",     outcome: "Official competitive rating. Advanced prep for State & National Championships.",           icon: Crown,   color: "text-amber-500",   bg: "bg-amber-500/5" },
];

const BOTTOM_STATS = [
  { icon: BrainCircuit, value: "Improved", label: "Focus & Math Skills" },
  { icon: Target,       value: "1 : 4",    label: "Teacher–Student Ratio" },
  { icon: Trophy,       value: "Aligned", label: "Tournament Curriculum" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CurriculumPage() {
  const [courses, setCourses]             = useState<Course[]>(fallbackCourses);
  const [roadmap, setRoadmap]             = useState<RoadmapMilestone[]>(fallbackRoadmap);

  useEffect(() => {
    getCourses()
      .then((d) => {
        if (d.success && d.data) {
          setCourses(d.data.courses);
          setRoadmap(d.data.roadmap.map(toMilestone));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="bg-[var(--color-ivory)] text-[var(--color-walnut)] overflow-hidden">

      {/* ── Hero ── */}
      <div className="relative">
        <GridBackground variant="dot" opacity={0.022} size={44} />
        <PageHero
          title="Four Levels, One Destination"
          description="A scientifically structured path from your first move to tournament mastery. Choose the right level for your child."
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-32">

        {/* ── Course cards grid ── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-32"
        >
          {courses.map((course, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className={`flex flex-col h-full p-8 rounded-3xl border bg-[var(--color-paper)] shadow-sm hover:shadow-[var(--shadow-card)] transition-all duration-300 border-t-4 ${course.accent} relative overflow-hidden group`}
            >
              {course.isPremium && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-gold)]/10 rounded-full blur-3xl pointer-events-none" />
              )}

              <div className="flex-grow relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${course.badgeColor}`}>
                    {course.level}
                  </span>
                  {course.isPremium && <Award className="w-5 h-5 text-[var(--color-gold)]" />}
                </div>

                <h3 className="font-[family-name:var(--font-playfair)] text-3xl text-[var(--color-walnut)] mb-1">
                  {course.title}
                </h3>
                <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-4">
                  {course.subtitle}
                </p>
                <p className="text-[var(--color-muted)] mb-7 text-sm leading-relaxed">{course.desc}</p>

                <div className="space-y-3 mb-6">
                  {course.topics.map((topic, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${course.isPremium ? "text-[var(--color-gold)]" : "text-[var(--color-pine)]"}`} />
                      <span className="text-sm text-[var(--color-walnut-soft)] font-medium leading-tight">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto relative z-10 pt-5 border-t border-[var(--color-line)]">
                <Link href="/contact">
                  <button className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all duration-300 ${
                    course.isPremium
                      ? "bg-[var(--color-walnut)] text-[var(--color-gold)] hover:bg-[var(--color-ember)] hover:text-white"
                      : "bg-[var(--color-ivory-deep)] text-[var(--color-walnut)] hover:bg-[var(--color-pine)] hover:text-white border border-[var(--color-line)] hover:border-transparent"
                  }`}>
                    Enroll Now <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Roadmap ── */}
        <div className="mb-32">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={stagger}
            className="text-center mb-16"
          >
            <SectionHeader
              title={<>The Long-Term <span className="italic text-[var(--color-ember)]">Roadmap</span></>}
              description="A realistic timeline of your child's cognitive and ratings development over 18+ months."
            />
          </motion.div>

          <div className="relative max-w-4xl mx-auto pl-8 md:pl-0">
            {/* Vertical guide line */}
            <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--color-gold)]/50 via-[var(--color-ember)]/30 to-transparent md:-translate-x-1/2" />

            <div className="space-y-12">
              {roadmap.map((m, idx) => {
                const Icon = m.icon as React.ComponentType<{ className?: string }>;
                const isEven = idx % 2 === 0;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={viewportConfig}
                    transition={{ duration: 0.55, delay: idx * 0.08 }}
                    className={`flex flex-col md:flex-row items-start md:items-center justify-between relative w-full ${isEven ? "md:flex-row-reverse" : ""}`}
                  >
                    {/* Node */}
                    <div className="absolute left-[-4px] md:left-1/2 top-2 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 z-20">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-paper)] border-2 border-[var(--color-gold)] flex items-center justify-center shadow-sm">
                        <Icon className={`w-4 h-4 ${m.color}`} />
                      </div>
                    </div>

                    {/* Card */}
                    <div className="w-full md:w-[44%] bg-[var(--color-paper)] p-6 rounded-2xl border border-[var(--color-line)] shadow-sm hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="text-[10px] font-bold text-[var(--color-ember)] uppercase tracking-wider">{m.phase}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${m.bg} ${m.color}`}>{m.rating}</span>
                      </div>
                      <h4 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--color-walnut)] mb-2">{m.title}</h4>
                      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{m.outcome}</p>
                    </div>

                    <div className="hidden md:block w-[44%]" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom stats dark panel ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={stagger}
          className="relative overflow-hidden mb-20"
        >
          <div className="bg-[var(--color-walnut)] text-[var(--color-paper)] rounded-3xl p-8 md:p-16 relative overflow-hidden">
            <GridBackground variant="dot" color="white" opacity={0.05} size={32} />
            {/* Ember glow accent */}
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-[var(--color-ember)]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="text-center mb-12">
                <motion.h2 variants={fadeUp} className="font-[family-name:var(--font-playfair)] text-3xl md:text-5xl mb-3">
                  Built for Real Results
                </motion.h2>
                <motion.p variants={fadeUp} className="text-[var(--color-muted)] text-base md:text-lg">
                  Every aspect of our curriculum is engineered for measurable growth.
                </motion.p>
              </div>

              <div className="grid grid-cols-3 gap-6 md:gap-8">
                {BOTTOM_STATS.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={idx} variants={fadeUp} className="flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 md:w-14 md:h-14 bg-[var(--color-ember)]/20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                        <Icon className="w-5 h-5 md:w-7 md:h-7 text-[var(--color-gold)]" />
                      </div>
                      <p className="font-[family-name:var(--font-playfair)] text-2xl md:text-4xl lg:text-5xl font-bold mb-1 md:mb-2 text-center">
                        {stat.value}
                      </p>
                      <p className="text-[var(--color-muted)] text-[10px] md:text-xs uppercase tracking-wider text-center max-w-[150px]">
                        {stat.label}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── FAQ ── */}
        <Faq />
      </div>

      {/* ── CTA ── */}
      <Cta
        title={<span className="text-[var(--color-ivory)]">Ready to choose your child's level? <span className="italic text-[var(--color-gold)]">Let's find out.</span></span>}
        description="Book a free assessment — our coaches will evaluate your child and recommend the perfect starting point."
        buttonText="Book Free Assessment"
        buttonHref="/contact"
      />
    </main>
  );
}
