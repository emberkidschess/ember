"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Video,
  Calendar,
  MessageSquare,
  BookOpen,
  Target,
  Users,
  ChevronRight,
  Sparkles,
  Triangle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";
import Faq from "./Faq";
import Testimonials from "./Testimonials";
import WhyChooseUs from "./WhyChooseUs";
import SectionHeader from "../shared/SectionHeader";
import GridBackground from "../shared/GridBackground";
import CoachCard from "../shared/CoachCard";
import CoachModal from "../shared/CoachModal";
import { COACHES } from "@/data/coaches";
import type { Coach } from "../shared/CoachCard";

// ─── WHY CHESS MATTERS ─────────────────────────────────────────────────────────

const skills = [
  {
    title: "Critical Thinking",
    desc: "Analyzes complex situations and thinks multiple steps ahead.",
  },
  {
    title: "Concentration",
    desc: "Builds laser-sharp focus that transfers to academics and daily life.",
  },
  {
    title: "Problem Solving",
    desc: "Develops creative solutions to challenging puzzles and real-world problems.",
  },
  {
    title: "Decision Making",
    desc: "Makes confident choices under pressure with strategic planning.",
  },
];

function WhyChessMattersSection() {
  return (
    <section className="relative w-full py-20 px-4 md:py-32 bg-[var(--color-ivory)] overflow-hidden">
      <GridBackground variant="dot" opacity={0.02} size={30} />

      {/* Chess piece watermarks */}
      <div className="absolute -top-10 -left-2 text-[250px] text-[var(--color-walnut)] opacity-[0.03] rotate-[-10deg] pointer-events-none select-none leading-none">
        ♞
      </div>
      <div className="absolute bottom-5 -right-5 text-[250px] text-[var(--color-walnut)] opacity-[0.03] rotate-[10deg] pointer-events-none select-none leading-none">
        ♟
      </div>

      <Sparkles className="absolute top-[15%] left-[10%] text-[var(--color-ember)] w-6 h-6 opacity-30" />
      <Triangle className="absolute bottom-[25%] right-[15%] text-[var(--color-pine)] w-5 h-5 opacity-30 rotate-45" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={stagger}
          className="text-center mb-20 md:mb-24"
        >
          <SectionHeader
            eyebrow="Why Chess Matters"
            title={
              <>
                More Than Just a Game, <br />
                A <span className="text-[var(--color-ember)] italic">Foundation</span> for Life.
              </>
            }
            description="Chess builds more than champions. It builds confident, focused, and future-ready thinkers."
          />
        </motion.div>

        {/* Chess Board */}
        <div className="relative max-w-5xl mx-auto mb-24 overflow-hidden rounded-xl aspect-auto lg:aspect-[21/9]">
          {/* BACKGROUND: Chessboard */}
          <div className="absolute inset-0 grid grid-cols-4 gap-1 p-2 bg-[var(--color-walnut)] min-h-full">
            {Array.from({ length: 16 }).map((_, i) => {
              const isLight = (Math.floor(i / 4) + i) % 2 === 0;
              return (
                <div
                  key={i}
                  className={`w-full h-full ${
                    isLight ? "bg-[var(--color-ivory)]" : "bg-[var(--color-walnut)]"
                  }`}
                />
              );
            })}
          </div>

          {/* FOREGROUND: Content */}
          <div className="relative lg:absolute lg:inset-0 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <motion.div
                key={skill.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewportConfig}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "tween", duration: 0.2 }}
                className="min-w-0 bg-[var(--color-paper)]/95 backdrop-blur-sm p-6 md:p-8 lg:p-10 rounded-xl shadow-lg border border-[var(--color-gold)]/30 flex flex-col justify-center"
              >
                <h3 className="text-lg md:text-xl lg:text-2xl font-semibold mb-2 md:mb-3">{skill.title}</h3>
                <p className="text-sm md:text-base lg:text-lg text-[var(--color-muted)] leading-relaxed">{skill.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── LEARNING JOURNEY ──────────────────────────────────────────────────────────

const learningJourneySteps = [
  {
    icon: BookOpen,
    eyebrow: "Step 1",
    title: "Concept Introduction",
    text: "Interactive lessons break down complex ideas into digestible concepts with visual aids and examples.",
  },
  {
    icon: Target,
    eyebrow: "Step 2",
    title: "Guided Practice",
    text: "Students apply new concepts through structured exercises with real-time feedback from coaches.",
  },
  {
    icon: Users,
    eyebrow: "Step 3",
    title: "Peer Learning",
    text: "Small group games and discussions reinforce learning through collaborative problem-solving.",
  },
  {
    icon: RefreshCw,
    eyebrow: "Step 4",
    title: "Review & Reinforce",
    text: "Session recaps and homework assignments ensure concepts stick and build toward mastery.",
  },
];

const LearningJourneySection = () => (
  <section className="py-20 md:py-32 bg-[var(--color-ivory)] relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute top-20 right-10 w-64 h-64 bg-[var(--color-ember)] opacity-[0.03] rounded-full blur-3xl" />
    <div className="absolute bottom-20 left-10 w-64 h-64 bg-[var(--color-pine)] opacity-[0.03] rounded-full blur-3xl" />

    <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={stagger}
        className="text-center mb-16"
      >
        <SectionHeader
          eyebrow="How Students Grow"
          title={
            <>
              The Learning{" "}
              <span className="italic text-[var(--color-ember)]">Journey</span>
            </>
          }
          description="A four-stage progression designed to take any child from curious beginner to confident competitor."
        />
      </motion.div>

      {/* Horizontal Timeline Design */}
      <div className="relative">
        {/* Connecting Line */}
        <div className="hidden md:block absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-ember)] via-[var(--color-pine)] to-[var(--color-ember)] rounded-full opacity-30" />

        <div className="grid md:grid-cols-4 gap-8 md:gap-4">
          {learningJourneySteps.map((step, idx) => (
            <motion.div
              key={idx}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewportConfig}
              custom={idx}
              className="relative"
            >
              {/* Step Number Circle */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, type: "spring", stiffness: 200, damping: 15 }}
                className="relative mx-auto md:mx-0 w-20 h-20 md:w-24 md:h-24 mb-6"
              >
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-ember)] opacity-20" />
                {/* Inner circle */}
                <div className={`absolute inset-2 rounded-full flex items-center justify-center ${idx % 2 === 0 ? 'bg-[var(--color-ember)]' : 'bg-[var(--color-pine)]'}`}>
                  <step.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                {/* Step number badge */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--color-walnut)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
              </motion.div>

              {/* Content */}
              <div className="text-center md:text-left md:pl-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 + 0.1 }}
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-ember)] mb-2 block">
                    {step.eyebrow}
                  </span>
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl md:text-2xl text-[var(--color-walnut)] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                    {step.text}
                  </p>
                </motion.div>
              </div>

              {/* Arrow connector (hidden on last item) */}
              {idx < learningJourneySteps.length - 1 && (
                <div className="hidden md:block absolute top-20 right-0 transform translate-x-1/2">
                  <ChevronRight className="w-6 h-6 text-[var(--color-ember)] opacity-30" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={fadeUp}
        className="text-center mt-16"
      >
        <Link href="/courses">
          <button className="inline-flex items-center gap-2 bg-transparent text-[var(--color-ember)] border-2 border-[var(--color-ember)] px-8 py-4 rounded-full font-bold uppercase tracking-[0.15em] text-sm hover:bg-[var(--color-ember)] hover:text-white transition-all duration-300">
            Start Your Journey
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
      </motion.div>
    </div>
  </section>
);

// ─── COURSES SNAPSHOT ─────────────────────────────────────────────────────────

const COURSE_CARDS = [
  {
    level: "Level 01",
    title: "Beginner",
    subtitle: "The Logic Core",
    accent: "bg-blue-500",
    desc: "Build a rock-solid base: piece movement, board geometry, basic checkmates, and opening principles.",
  },
  {
    level: "Level 02",
    title: "Intermediate",
    subtitle: "Tactical Vision",
    accent: "bg-[var(--color-pine)]",
    desc: "Identify patterns, create threats, and calculate short sequences with precision.",
  },
  {
    level: "Level 03",
    title: "Advanced",
    subtitle: "Strategic Mastery",
    accent: "bg-[var(--color-ember)]",
    desc: "Think like a master. Anticipate opponent plans and build long-term winning strategies.",
  },
  {
    level: "Level 04",
    title: "Elite",
    subtitle: "Grandmaster Prep",
    accent: "bg-[var(--color-gold)]",
    desc: "Tournament preparation, opening repertoire development, and deep psychological training.",
  },
];

const CoursesSection = () => (
  <section className="py-20 md:py-32 bg-[var(--color-paper)] relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={stagger}
        className="text-center mb-16"
      >
        <SectionHeader
          eyebrow="Curriculum"
          title={
            <>
              Four Levels,{" "}
              <span className="italic text-[var(--color-ember)]">One Destination</span>
            </>
          }
          description="A structured progression from absolute beginner to tournament-ready competitor."
        />
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {COURSE_CARDS.map((course, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
            className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] overflow-hidden group hover:shadow-[var(--shadow-card)] transition-all duration-300"
          >
            <div className={`h-1.5 w-full ${course.accent}`} />
            <div className="p-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2 block">
                {course.level}
              </span>
              <h3 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--color-walnut)] mb-0.5">
                {course.title}
              </h3>
              <p className="text-xs font-bold text-[var(--color-ember)] mb-4 uppercase tracking-wider">
                {course.subtitle}
              </p>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{course.desc}</p>
              <Link
                href="/courses"
                className="mt-6 flex items-center gap-1 text-[var(--color-ember)] text-xs font-bold group-hover:gap-2 transition-all duration-200"
              >
                Explore Level <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={fadeUp}
        className="text-center mt-12"
      >
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-[var(--color-ember)] font-bold hover:gap-4 transition-all duration-300"
        >
          View Full Curriculum & Roadmap
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </div>
  </section>
);

// ─── MEET THE COACHES ──────────────────────────────────────────────────────────

const MeetCoachesSection = () => {
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  return (
  <section className="bg-[var(--color-ivory)] py-16 px-4 sm:px-6 md:py-28 lg:px-8 overflow-hidden">
    <div className="max-w-7xl mx-auto">
      <div className="mb-12 md:mb-20 max-w-2xl">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportConfig} variants={stagger}>
          <SectionHeader
            eyebrow="Expert Guidance"
            title={
              <>
                Meet Our{" "}
                <span className="italic text-[var(--color-ember)]">Coaches</span>
              </>
            }
            description="Learn from experienced masters who are passionate about nurturing young chess talent."
            align="left"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-y-12 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {COACHES.map((coach, index) => (
          <CoachCard 
            key={coach.name} 
            coach={coach} 
            index={index} 
            variant="default"
            onClick={() => setSelectedCoach(coach)}
          />
        ))}
      </div>
      
      <CoachModal 
        coach={selectedCoach}
        isOpen={!!selectedCoach}
        onClose={() => setSelectedCoach(null)}
      />
    </div>
  </section>
);
};

// ─── RISING STARS ──────────────────────────────────────────────────────────────

const FEATURED_STUDENT = {
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

const RisingStarsSection = () => (
  <section className="py-20 md:py-32 bg-[var(--color-paper)] relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={stagger}
        className="text-center mb-16"
      >
        <SectionHeader
          eyebrow="Student Success"
          title={
            <>
              Rising{" "}
              <span className="italic text-[var(--color-ember)]">Star</span>
            </>
          }
          description="Meet our featured student who has transformed their chess journey with EmberKids."
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-[var(--color-ivory)] border border-[var(--color-line)] rounded-2xl p-8 md:p-12 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-gold)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Student Visual Frame */}
            <div className="lg:col-span-5 relative w-full aspect-[4/5] bg-[var(--color-paper)] rounded-2xl overflow-hidden border border-[var(--color-line)] shadow-inner">
              <Image
                src={FEATURED_STUDENT.image}
                alt={FEATURED_STUDENT.name}
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
                    {FEATURED_STUDENT.age}
                  </span>
                </div>

                <h2 className="font-serif text-4xl md:text-5xl text-[var(--color-walnut)] mb-2">
                  {FEATURED_STUDENT.name}
                </h2>
                <p className="text-base font-bold text-[var(--color-ember)] uppercase tracking-wider mb-6">
                  {FEATURED_STUDENT.title}
                </p>

                <div className="relative mb-6">
                  <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed font-medium italic">
                    "{FEATURED_STUDENT.story}"
                  </p>
                </div>
              </div>

              {/* Achievements Bullet List */}
              <div className="pt-6 border-t border-[var(--color-line)]">
                <h5 className="text-xs font-bold uppercase tracking-widest text-[var(--color-walnut)] mb-4">
                  Key Achievements
                </h5>
                <ul className="space-y-3">
                  {FEATURED_STUDENT.achievements.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-[var(--color-walnut-soft)] font-medium"
                    >
                      <span className="text-[var(--color-gold)]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={fadeUp}
        className="text-center mt-12"
      >
        <Link
          href="/prodigies"
          className="inline-flex items-center gap-2 text-[var(--color-ember)] font-bold hover:gap-4 transition-all duration-300"
        >
          View All Success Stories
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </div>
  </section>
);

// ─── LIVE CLASS EXPERIENCE ─────────────────────────────────────────────────────

const LIVE_FEATURES = [
  { icon: Video, text: "HD Video Quality" },
  { icon: MessageSquare, text: "Real-time Chat" },
  { icon: Calendar, text: "Flexible Scheduling" },
  { icon: Users, text: "Small Groups (Max 6)" },
];

const LiveClassExperienceSection = () => (
  <section className="py-20 md:py-32 bg-[var(--color-ivory)] relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={stagger}
        className="text-center mb-16"
      >
        <SectionHeader
          eyebrow="Live Learning"
          title={
            <>
              Experience Our{" "}
              <span className="italic text-[var(--color-ember)]">Live Classes</span>
            </>
          }
          description="Join interactive sessions where your child learns in real-time with expert coaches. Small batches ensure personalized attention."
        />
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={fadeUp}
        className="relative max-w-5xl mx-auto"
      >
        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border border-[var(--color-line)]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
          <video
            src="https://res.cloudinary.com/aaa97ofg/video/upload/v1783288900/chess-academy/liveclass.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-120"
          />
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 md:p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {LIVE_FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex items-center gap-2.5 text-white">
                    <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={fadeUp}
        className="text-center mt-12"
      >
        <Link href="/contact">
          <button className="inline-flex items-center gap-2 bg-[var(--color-ember)] text-white px-8 py-4 rounded-full font-bold uppercase tracking-[0.15em] text-sm hover:bg-[var(--color-ember-deep)] transition-all duration-300 shadow-lg hover:shadow-[var(--color-ember)]/30 hover:shadow-xl hover:-translate-y-0.5">
            Book a Free Trial Class
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
      </motion.div>
    </div>
  </section>
);

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export default function HomeSections() {
  return (
    <>
      <WhyChessMattersSection />
      <WhyChooseUs />
      <LearningJourneySection />
      <CoursesSection />
      <MeetCoachesSection />
      <RisingStarsSection />
      <LiveClassExperienceSection />
      <Testimonials />
      <Faq />
    </>
  );
}
