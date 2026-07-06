"use client";

import { motion } from "framer-motion";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";

const ADVANTAGES = [
  {
    number: "01",
    title: "Expert Mentorship",
    description:
      "Learn directly from experienced competitors who transfer battle-tested intuition and elite calculation frameworks to your child's repertoire.",
  },
  {
    number: "02",
    title: "The Half-Decade Blueprint",
    description:
      "Our pedagogy is the culmination of five years of curriculum refinement — stripping away obsolete theory and scaling the exact habits that forge champions.",
  },
  {
    number: "03",
    title: "Pressure-Tested Simulations",
    description:
      "Our internal tournament circuits simulate intense psychological pressure, inoculating students against clock anxiety for rigorous external competitions.",
  },
  {
    number: "04",
    title: "Certified Excellence",
    description:
      "Graduation concludes with an official certification — a tangible, respected credential of your child's strategic competence and achievement.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="relative w-full bg-[var(--color-paper)] text-[var(--color-walnut)] py-20 sm:py-24 lg:min-h-screen lg:py-32 px-5 sm:px-6 lg:px-12 selection:bg-[var(--color-ember)]/20 selection:text-[var(--color-walnut)]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-32">

        {/* Left: Sticky headline */}
        <div className="lg:w-1/3 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            variants={stagger}
            className="sticky top-32"
          >
            <motion.span variants={fadeUp} className="text-[var(--color-ember)] font-bold tracking-widest uppercase text-xs mb-4 block">
              Our Advantage
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl text-[var(--color-walnut)] mb-10 leading-[1.1]">
              What Makes Us <br className="hidden lg:block" />
              <span className="italic text-[var(--color-ember)]">Unique</span>?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-[var(--color-muted)] leading-relaxed max-w-sm font-light">
              We replace generic advice with rigorous, competitive frameworks. Step away from amateur habits and into an environment engineered for serious cognitive growth.
            </motion.p>
          </motion.div>
        </div>

        {/* Right: Editorial hover list */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={stagger}
          className="lg:w-2/3 flex flex-col pt-8 lg:pt-0 group/list"
        >
          {ADVANTAGES.map((item, index) => (
            <motion.div
              variants={fadeUp}
              key={index}
              className={`
                group/item relative flex flex-col md:flex-row items-start py-10 sm:py-12 lg:py-16
                transition-all duration-700 ease-out
                lg:hover:!opacity-100 lg:group-hover/list:opacity-30
                ${index === 0 ? "pt-0" : "border-t border-[var(--color-line)]"}
              `}
            >
              {/* Number + expanding line */}
              <div className="flex items-center gap-6 w-full md:w-32 shrink-0 mb-6 md:mb-0">
                <div className="text-2xl md:text-3xl font-[family-name:var(--font-playfair)] italic text-[var(--color-muted)] group-hover/item:text-[var(--color-ember)] transition-colors duration-500">
                  {item.number}.
                </div>
                <div className="h-[1px] bg-[var(--color-ember)] w-0 group-hover/item:w-12 transition-all duration-500 ease-out hidden md:block" />
              </div>

              {/* Content — shifts right on hover */}
              <div className="flex-1 transform md:group-hover/item:translate-x-4 transition-transform duration-500 ease-out">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-[family-name:var(--font-playfair)] text-[var(--color-walnut)] mb-4 sm:mb-6 transition-colors duration-500">
                  {item.title}
                </h3>
                <p className="text-base sm:text-lg md:text-xl text-[var(--color-muted)] leading-relaxed font-light max-w-2xl group-hover/item:text-[var(--color-walnut-soft)] transition-colors duration-500">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
