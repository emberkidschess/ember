"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, stagger, viewportConfig } from "../shared/animations";
import type { FAQItem as FAQItemType } from "@/types";

const faqs: FAQItemType[] = [
  {
    question: "Is this program suitable for absolute beginners?",
    answer:
      "Yes, absolutely. Level 01 (The Logic Core) is designed specifically for children who have never seen a chessboard before. We start from the absolute basics—how the pieces move and the rules of the game.",
  },
  {
    question: "What is the ideal age for a child to start learning chess?",
    answer:
      "We recommend starting from age 5 and above. At this stage, children have developed the cognitive ability to understand basic logic, spatial orientation, and turn-taking, making it the perfect window to introduce strategic thinking.",
  },
  {
    question: "What happens if my child misses a scheduled class?",
    answer:
      "Don't worry. All our live sessions are recorded, and students get lifetime access to the dashboard recordings. Additionally, we provide a 15-minute doubt-clearing window before the next session to ensure they catch up.",
  },
  {
    question: "How do you determine which level is right for my child?",
    answer:
      "We offer a Free Trial and Assessment Session. During this session, one of our certified coaches interacts with your child to evaluate their current understanding, logical patterns, and chess knowledge to recommend the perfect fit.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: FAQItemType & { isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div variants={fadeUp} className="border-b border-[var(--color-line)] py-5">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex justify-between items-center text-left py-2 group"
      >
        <span className="font-serif text-lg md:text-xl text-[var(--color-walnut)] group-hover:text-[var(--color-ember)] transition-colors duration-200">
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-xl text-[var(--color-muted)] font-light ml-4"
        >
          +
        </motion.span>
      </button>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <p className="text-sm md:text-base text-[var(--color-muted)] leading-relaxed pt-2 pb-4 pr-6">
          {answer}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function Faq() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-32 bg-[var(--color-ivory)]">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={stagger}
        className="max-w-3xl mx-auto px-6 md:px-0"
      >
      <motion.div variants={fadeUp} className="text-center mb-16">
        <h2 className="font-serif text-4xl md:text-5xl mb-4">Frequently Asked Questions</h2>
        <p className="text-[var(--color-muted)]">
          Got questions about our training modules? We have got you covered.
        </p>
      </motion.div>

      <div className="border-t border-[var(--color-line)]">
        {faqs.map((faq, idx) => (
          <FAQItem
            key={idx}
            question={faq.question}
            answer={faq.answer}
            isOpen={openFAQ === idx}
            onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
          />
        ))}
      </div>
    </motion.div>
    </section>
  );
}
