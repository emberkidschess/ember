"use client";

import Cta from "@/components/sections/Cta";
import Testimonials from "@/components/sections/Testimonials";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import Image from "next/image";
import { motion } from "framer-motion";
import { BrainCircuit, Sparkles, Trophy, Target, Map, UserCheck } from "lucide-react";
import { fadeUpVariant, staggerContainer, viewportConfig } from "@/components/shared/animations";
import PageHero from "@/components/shared/PageHero";
import SectionHeader from "@/components/shared/SectionHeader";
import StatsRow from "@/components/shared/StatsRow";

const STATS = [
  { num: 5000, suffix: "+", label: "Students Trained" },
  { num: 250, suffix: "+", label: "Tournament Wins" },
  { num: 20, suffix: "+", label: "Countries" },
  { textValue: "1:1", label: "Mentorship Support", textClass: "text-[var(--color-ember)]" },
];

const TRANSFORMATIONS = [
  { icon: Target, title: "Sharper Focus", desc: "Improved attention spans in academics." },
  { icon: BrainCircuit, title: "Decision Making", desc: "Thinking 3 steps ahead under pressure." },
  { icon: Sparkles, title: "Strategic Thinking", desc: "Solving complex problems with logic." },
  { icon: Trophy, title: "Tournament Confidence", desc: "Building emotional resilience." },
];

const PHILOSOPHY = [
  {
    h: "Think Better",
    p: "We reject rote memorization. The board is a simulator for processing information and identifying deep patterns.",
  },
  {
    h: "Plan Better",
    p: "By stripping away the ego of winning, we teach students the patience of cause and effect over the long term.",
  },
  {
    h: "Decide Better",
    p: "Every move is a conversation with the future. We give children the intellectual discipline to handle the pressure of choice.",
  },
];

const CLASS_STEPS = [
  {
    icon: UserCheck,
    step: "Step 1",
    title: "Skill Assessment",
    p: "Evaluating your child's starting baseline.",
  },
  {
    icon: Map,
    step: "Step 2",
    title: "Structured Training",
    p: "Progressive learning through our curated curriculum.",
  },
  {
    icon: Trophy,
    step: "Step 3",
    title: "Tournament Prep",
    p: "Simulated games and competitive readiness.",
  },
];

export default function AcademyPage() {
  return (
    <main className="bg-[var(--color-ivory)] text-[var(--color-walnut)] pb-20 selection:bg-[var(--color-ember)] selection:text-[var(--color-paper)] relative">

      {/* 1. HERO */}
      <div className="relative">
        <div className="px-6 md:px-12 max-w-7xl mx-auto mb-12">
          <PageHero
            title={
              <>
                The Art of{" "}
                <span className="italic text-[var(--color-ember)]">Strategic Thought</span>
              </>
            }
            description="At EmberKids, we believe chess is not just a game of pieces, but a rigorous mental gymnasium that shapes future-ready thinkers."
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-[var(--color-ivory-deep)] rounded-3xl overflow-hidden shadow-[var(--shadow-soft)] border border-[var(--color-line)] group mt-12"
          >
            <Image
              src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288731/chess-academy/academychild.png"
              alt="Students playing chess at EmberKids Academy"
              fill
              sizes="(max-width: 768px) 100vw, 90vw"
              className="object-cover group-hover:scale-105 transition-transform duration-1000"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-walnut)]/40 to-transparent" />
          </motion.div>
        </div>
      </div>

      {/* 2. STATS */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto pb-16 md:pb-20">
        <StatsRow stats={STATS} bordered />
      </section>

      {/* 3. EDITORIAL QUOTE */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto my-12 md:my-16">
        <div
          className="relative w-full bg-[var(--color-walnut)] text-[var(--color-ivory)] py-20 text-center overflow-hidden"
          style={{
            clipPath: `polygon(
              0% 16px, 8px 16px, 8px 8px, 16px 8px, 16px 0%,
              calc(100% - 16px) 0%, calc(100% - 16px) 8px, calc(100% - 8px) 8px, calc(100% - 8px) 16px, 100% 16px,
              100% calc(100% - 16px), calc(100% - 8px) calc(100% - 16px), calc(100% - 8px) calc(100% - 8px), calc(100% - 16px) calc(100% - 8px), calc(100% - 16px) 100%,
              16px 100%, 16px calc(100% - 8px), 8px calc(100% - 8px), 8px calc(100% - 16px), 0% calc(100% - 16px)
            )`,
          }}
        >
          <div className="absolute top-8 left-8 w-3 h-3 bg-[var(--color-ember)]/80" />
          <div className="absolute bottom-8 right-8 w-3 h-3 bg-[var(--color-gold)]/80" />

          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              variants={fadeUpVariant}
              viewport={viewportConfig}
            >
              <Sparkles className="w-8 h-8 text-[var(--color-gold)] mx-auto mb-8 opacity-80" />
              <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl leading-[1.3]">
                &quot;Chess is the gymnasium{" "}
                <br className="hidden md:block" />
                <span className="italic text-[var(--color-gold)]">of the mind.&quot;</span>
              </h2>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. TRANSFORMATION */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto py-12 md:py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <SectionHeader
            title={
              <>
                What happens{" "}
                <span className="italic text-[var(--color-ember)]">after joining?</span>
              </>
            }
          />
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 text-center mb-24"
        >
          {TRANSFORMATIONS.map((item, i) => (
            <motion.div key={i} variants={fadeUpVariant} className="flex flex-col items-center group">
              <div className="w-16 h-16 rounded-full bg-[var(--color-paper)] border border-[var(--color-line)] flex items-center justify-center mb-6 shadow-sm group-hover:border-[var(--color-ember)]/40 group-hover:shadow-md transition-all duration-300">
                <item.icon className="w-7 h-7 text-[var(--color-pine)]" />
              </div>
              <h4 className="font-bold text-base mb-2 text-[var(--color-walnut)]">{item.title}</h4>
              <p className="text-[var(--color-muted)] text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Philosophy pillars */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 border-t border-[var(--color-line)] pt-16">
          {PHILOSOPHY.map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUpVariant}
              initial="hidden"
              whileInView="visible"
              viewport={viewportConfig}
              className="border-l-4 border-[var(--color-ember)]/40 pl-6 hover:border-[var(--color-ember)] transition-colors duration-300"
            >
              <h3 className="font-[family-name:var(--font-playfair)] text-3xl mb-4 text-[var(--color-walnut-soft)]">
                {item.h}
              </h3>
              <p className="text-[var(--color-muted)] leading-relaxed">{item.p}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. WHY CHOOSE US */}
      <WhyChooseUs />

      {/* 6. HOW CLASSES WORK */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto py-12 md:py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeUpVariant}
          className="text-center mb-16"
        >
          <SectionHeader
            title={
              <>
                How{" "}
                <span className="italic text-[var(--color-ember)]">Classes Work</span>
              </>
            }
          />
        </motion.div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative">
          <div className="hidden md:block absolute top-[40%] left-0 w-full h-[2px] bg-[var(--color-line-strong)] -z-10" />
          <div className="block md:hidden absolute left-[3.5rem] top-0 bottom-0 w-[2px] bg-[var(--color-line-strong)] -z-10" />

          {CLASS_STEPS.map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUpVariant}
              initial="hidden"
              whileInView="visible"
              viewport={viewportConfig}
              className="bg-[var(--color-ivory)] p-6 text-left md:text-center w-full md:w-1/3 flex md:flex-col items-center md:items-center gap-6 md:gap-0"
            >
              <div className="w-14 h-14 shrink-0 rounded-full bg-[var(--color-pine)] text-white flex items-center justify-center md:mb-6 ring-8 ring-[var(--color-paper)]">
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[var(--color-ember)] text-[10px] font-bold uppercase tracking-widest mb-1 md:mb-2">
                  {item.step}
                </div>
                <h4 className="font-[family-name:var(--font-playfair)] text-xl mb-1 md:mb-2 text-[var(--color-walnut)]">
                  {item.title}
                </h4>
                <p className="text-[var(--color-muted)] text-sm">{item.p}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 7. TESTIMONIALS */}
      <Testimonials />

      {/* 8. CTA */}
      <Cta
        title={
          <span className="text-[var(--color-ivory)]">
            Ready to build a{" "}
            <br />
            <span className="italic text-[var(--color-gold)]">strategic mind?</span>
          </span>
        }
        buttonText="Book Free Trial"
        buttonHref="/contact"
      />
    </main>
  );
}
