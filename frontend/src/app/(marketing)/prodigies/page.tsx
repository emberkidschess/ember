"use client";

import { motion } from "framer-motion";
import { Quote, Award, Trophy } from "lucide-react";
import Image from "next/image";
import Cta from "@/components/sections/Cta";
import Testimonials from "@/components/sections/Testimonials";
import { fadeUp, stagger, viewportConfig } from "@/components/shared/animations";
import PageHero from "@/components/shared/PageHero";
import SectionHeader from "@/components/shared/SectionHeader";
import CoachCard from "@/components/shared/CoachCard";
import LaurelWreath from "@/components/shared/LaurelWreath";
import { COACHES } from "@/data/coaches";
import type { StudentSpotlight, Prodigy } from "@/types";
import type { Coach } from "@/components/shared/CoachCard";
import { getProdigies } from "@/lib/api";
import { useState, useEffect } from "react";
import CoachModal from "@/components/shared/CoachModal";

// ─── FALLBACK DATA ─────────────────────────────────────────────────────────────

const fallbackSpotlight: StudentSpotlight = {
  name: "Balamithran Vijay",
  age: "Young Chess Champion",
  title: "London Chess Club Junior Tournament Winner",
  image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288888/chess-academy/bala.jpg",
  story: "Balamithran joined our academy with a passion for chess and a dream to compete at the highest level. Through dedicated training, consistent practice, and strategic guidance, he developed exceptional tactical skills and positional understanding. His outstanding performance of 6.5/7 at the London Chess Club Junior Tournament, achieving a tournament rating of 1175, is a testament to his hard work and determination. His journey inspires all young chess enthusiasts at our academy.",
  achievements: [
    "🥇 1st Place — London Chess Club Junior Tournament",
    "Outstanding Performance — 6.5/7 points",
    "Tournament Rating — 1175",
    "Consistent dedication and improvement",
  ],
};

const fallbackProdigies: Prodigy[] = [
  {
    name: "Monica Jangid",
    age: "8 Years Old",
    milestone: "National Qualifier",
    image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288886/chess-academy/ana3.png",
    snippet: "Mastered endgame theory in record time. Currently youngest player in the city top 20.",
  },
  {
    name: "Kabir Malhotra",
    age: "9 Years Old",
    milestone: "Rated Competitor",
    image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288833/chess-academy/ana2.png",
    snippet: "Known for deep prophylactic thinking. Recently went undefeated in the District Open.",
  },
  {
    name: "Rohan Deshmukh",
    age: "10 Years Old",
    milestone: "School Board Gold Medalist",
    image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288886/chess-academy/ana3.png",
    snippet: "Aggressive tactical playstyle. Solves complex tactical puzzles in under 30 seconds.",
  },
  {
    name: "Meera Joshi",
    age: "8 Years Old",
    milestone: "State Girls Runner-Up",
    image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288786/chess-academy/ana.png",
    snippet: "Exceptional tournament endurance. Overcame a major disadvantage to win her last tournament.",
  },
];

// ─── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function ProdigiesPage() {
  const [spotlightStudent, setSpotlightStudent] = useState<StudentSpotlight>(fallbackSpotlight);
  const [prodigiesList, setProdigiesList] = useState<Prodigy[]>(fallbackProdigies);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  useEffect(() => {
    getProdigies()
      .then((data) => {
        if (data.success && data.data) {
          setSpotlightStudent(data.data.spotlight);
          // Use fallback if prodigies array is empty
          setProdigiesList(data.data.prodigies.length > 0 ? data.data.prodigies : fallbackProdigies);
        }
      })
      .catch((error) => {
        console.error('Error fetching prodigies:', error);
        setSpotlightStudent(fallbackSpotlight);
        setProdigiesList(fallbackProdigies);
      });
  }, []);

  return (
    <main className="bg-[var(--color-ivory)] text-[var(--color-walnut)] overflow-hidden">

      {/* ── SECTION 1: PAGE HERO ── */}
      <div className="relative overflow-hidden">
        {/* Decorative laurel flourishes — the "hall of fame" motif */}
        <LaurelWreath
          className="absolute -left-10 top-25 w-28 h-28 md:w-40 md:h-40 lg:w-52 lg:h-52 opacity-[0.18] -rotate-[18deg] pointer-events-none select-none"
        />
        <LaurelWreath
          className="absolute -right-10 top-25 w-28 h-28 md:w-40 md:h-40 lg:w-52 lg:h-52 opacity-[0.18] rotate-[18deg] scale-x-[-1] pointer-events-none select-none"
        />

        <PageHero
          title="Shaped to Dominate"
          description="We don't just teach moves; we cultivate tactical thinkers. Meet our finest minds who transformed their focus into historic milestones."
        />
      </div>

      {/* ── SECTION 2: FEATURED PRODIGY SPOTLIGHT ── */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto pb-16 md:pb-20">
        <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[32px] p-8 md:p-12 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-gold)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Student Visual Frame */}
            <div className="lg:col-span-5 relative w-full aspect-[4/5] bg-[var(--color-ivory-deep)] rounded-2xl overflow-hidden border border-[var(--color-line)] shadow-inner">
              <Image
                src={spotlightStudent.image}
                alt={spotlightStudent.name}
                fill
                sizes="(max-w-768px) 100vw, (max-w-1200px) 50vw, 600px"
                quality={95}
                className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>

            {/* Editorial Content Side */}
            <div className="lg:col-span-7 flex flex-col justify-between h-full">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-sm text-[var(--color-muted)] font-medium">
                    {spotlightStudent.age}
                  </span>
                </div>

                <h2 className="font-serif text-4xl md:text-5xl text-[var(--color-walnut)] mb-2">
                  {spotlightStudent.name}
                </h2>
                <p className="text-base font-bold text-[var(--color-ember)] uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[var(--color-gold)]" /> {spotlightStudent.title}
                </p>

                <div className="relative mb-6">
                  <Quote className="w-12 h-12 text-[var(--color-line)] absolute -top-4 -left-6 -z-0 opacity-40" />
                  <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed relative z-10 font-medium italic pl-6">
                    "{spotlightStudent.story}"
                  </p>
                </div>
              </div>

              {/* Achievements Bullet List Grid */}
              <div className="pt-6 border-t border-[var(--color-line)]">
                <h5 className="text-xs font-bold uppercase tracking-widest text-[var(--color-walnut)] mb-4">
                  Key Career Milestones
                </h5>
                <ul className="space-y-3">
                  {spotlightStudent.achievements.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-[var(--color-walnut-soft)] font-medium"
                    >
                      <Trophy className="w-4 h-4 text-[var(--color-gold)] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: RISING COMPETITORS GRID ── */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto pb-16 md:pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <motion.div initial="hidden" whileInView="visible" viewport={viewportConfig} variants={stagger}>
              <SectionHeader
                title={
                  <>
                    Rising{" "}
                    <span className="italic text-[var(--color-ember)]">Competitors</span>
                  </>
                }
                description="Our upcoming generation of tactical chess architects."
                align="left"
              />
            </motion.div>
          </div>
          <motion.span
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={fadeUp}
            className="text-xs font-bold text-[var(--color-muted)] font-mono uppercase tracking-widest shrink-0"
          >
            24+ Active Board Podiums
          </motion.span>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {prodigiesList.map((student, idx) => (
            <div
              key={idx}
              className="bg-[var(--color-paper)] border border-[var(--color-line)] p-6 rounded-2xl flex flex-col justify-between h-full hover:shadow-[var(--shadow-card)] transition-all duration-300 relative group"
            >
              <div>
                <div className="flex justify-end items-center mb-6">
                  <span className="text-xs font-mono text-[var(--color-muted)] font-bold">
                    {student.age}
                  </span>
                </div>

                {/* Student Image Container */}
                <div className="w-full aspect-[4/3] bg-[var(--color-ivory)] border border-[var(--color-line)] rounded-xl mb-4 relative overflow-hidden group-hover:border-[var(--color-gold)] transition-colors duration-300">
                  <Image
                    src={student.image}
                    alt={student.name}
                    fill
                    sizes="(max-w-640px) 100vw, (max-w-1024px) 50vw, 400px"
                    quality={92}
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <h3 className="font-serif text-2xl text-[var(--color-walnut)] group-hover:text-[var(--color-ember)] transition-colors duration-200 mb-1">
                  {student.name}
                </h3>
                <p className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-wider mb-3">
                  {student.milestone}
                </p>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                  {student.snippet}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── SECTION 4: MEET THE COACHES ── */}
      <section className="bg-[var(--color-ivory)] py-16 md:py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={stagger}
            className="text-center mb-16"
          >
            <SectionHeader
              title={
                <>
                  The Coaches Who{" "}
                  <span className="italic text-[var(--color-ember)]">Make It Happen</span>
                </>
              }
              description="Every prodigy has a mentor who believed in them before they believed in themselves. Meet the experienced masters who shape EmberKids champions."
            />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="grid md:grid-cols-3 gap-8"
          >
            {COACHES.map((coach, i) => (
              <CoachCard 
                key={coach.name} 
                coach={coach} 
                index={i} 
                variant="default"
                onClick={() => setSelectedCoach(coach)}
              />
            ))}
          </motion.div>

          <CoachModal 
            coach={selectedCoach}
            isOpen={!!selectedCoach}
            onClose={() => setSelectedCoach(null)}
          />

          {/* Philosophy strip */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={fadeUp}
            className="mt-16 bg-[var(--color-walnut)] rounded-2xl p-8 md:p-12 text-[var(--color-ivory)] relative overflow-hidden"
          >
            <div className="relative z-10 max-w-3xl mx-auto text-center">
              <Quote className="w-8 h-8 text-[var(--color-gold)]/40 mx-auto mb-6" />
              <p className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl italic leading-relaxed mb-6">
                &ldquo;We don&apos;t just teach chess. We teach children how to think — and that changes everything.&rdquo;
              </p>
              <p className="text-[var(--color-muted)] text-sm uppercase tracking-widest font-bold">
                — The EmberKids Coaching Philosophy
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 5: PARENT VOICES ── */}
      <Testimonials />

      {/* ── SECTION 6: CTA ── */}
      <Cta
        title={
          <span className="text-[var(--color-ivory)]">
            Ready to uncover your child&apos;s{" "}
            <span className="italic text-[var(--color-gold)]">hidden genius?</span>
          </span>
        }
        description="Book a personalized 1-on-1 assessment trial with our master coaches. We will analyze your child's cognitive patterns and map out their direct route to success."
        buttonText="Book a Free Assessment"
        buttonHref="/contact"
      />
    </main>
  );
}
