"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, GraduationCap, Users, Trophy, Clock } from "lucide-react";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";
import type { AdmissionStep } from "@/types";

const admissionSteps: AdmissionStep[] = [
  {
    icon: GraduationCap,
    title: "Skill Assessment",
    description:
      "Free evaluation session to determine your child's current chess level and learning needs.",
  },
  {
    icon: Users,
    title: "Batch Selection",
    description:
      "Choose from flexible batch timings that fit your schedule - weekends, weekdays, or evenings.",
  },
  {
    icon: Clock,
    title: "Trial Session",
    description:
      "Experience a free trial class to meet our coaches and understand our teaching methodology.",
  },
  {
    icon: Trophy,
    title: "Enrollment",
    description:
      "Complete enrollment and begin your structured chess learning journey with EmberKids.",
  },
];

const benefits: string[] = [
  "Personalized attention in small batches",
  "Progress tracking with regular feedback",
  "Access to online resources and puzzles",
  "Participation in internal tournaments",
  "Certification upon course completion",
  "Parent-teacher meetings",
];

export default function Admission() {
  return (
    <section className="px-6 md:px-12 py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeUp}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-xs font-bold uppercase tracking-[0.28em] text-[#D86B45]">
            Admission Process
          </span>
          <h2 className="mt-5 font-[family-name:var(--font-playfair)] text-4xl md:text-6xl leading-[1.1] text-[#1D1A17]">
            Join the EmberKids Family
          </h2>
          <p className="mt-6 text-base md:text-lg leading-relaxed text-[var(--color-muted)] max-w-2xl mx-auto">
            A simple 4-step process to get your child started on their chess journey
          </p>
        </motion.div>

        {/* Admission Steps */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {admissionSteps.map((step, index) => (
            <motion.div key={step.title} variants={fadeUp} className="relative group">
              <div className="bg-gradient-to-b from-[var(--color-ivory)] to-white p-6 rounded-2xl border border-[var(--color-line)] hover:border-[#D86B45]/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                {/* Step Number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#D86B45] text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 bg-gradient-to-br from-[#D86B45] to-[#D86B45]/80 rounded-xl flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1D1A17] mb-3">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeUp}
          className="bg-gradient-to-br from-[#1D1A17] to-[#2D2A27] rounded-3xl p-8 md:p-12 text-white"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold mb-6">
                Why Choose EmberKids?
              </h3>
              <p className="text-base leading-relaxed text-white/80 mb-8">
                We don't just teach chess moves - we develop critical thinking, patience, and
                strategic decision-making skills that last a lifetime.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D86B45] shrink-0 mt-0.5" />
                    <span className="text-sm text-white/90">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h4 className="font-[family-name:var(--font-playfair)] text-2xl font-bold mb-6">
                Ready to Start?
              </h4>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-white/90">
                  <div className="w-2 h-2 bg-[#D86B45] rounded-full" />
                  No prior chess experience required
                </li>
                <li className="flex items-center gap-3 text-sm text-white/90">
                  <div className="w-2 h-2 bg-[#D86B45] rounded-full" />
                  Age-appropriate curriculum
                </li>
                <li className="flex items-center gap-3 text-sm text-white/90">
                  <div className="w-2 h-2 bg-[#D86B45] rounded-full" />
                  Flexible payment options
                </li>
                <li className="flex items-center gap-3 text-sm text-white/90">
                  <div className="w-2 h-2 bg-[#D86B45] rounded-full" />
                  Money-back guarantee on first month
                </li>
              </ul>
              <button className="w-full bg-[#D86B45] text-white py-4 rounded-xl font-bold uppercase tracking-[0.18em] text-xs hover:bg-[#D86B45]/90 transition-all duration-300 flex items-center justify-center gap-2">
                Book Free Trial
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
