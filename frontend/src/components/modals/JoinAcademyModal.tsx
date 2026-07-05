"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Compass, MessageCircle, CreditCard, GraduationCap, ArrowRight } from "lucide-react";

interface JoinAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTrial: () => void;
}

const STEPS = [
  { icon: Compass, title: "Free Trial", desc: "Your child joins a live trial class with one of our coaches." },
  { icon: MessageCircle, title: "Parent Discussion", desc: "We talk through the right course level and schedule for your child." },
  { icon: CreditCard, title: "Enrollment", desc: "Once you're ready, our team sends a secure payment link to confirm enrollment." },
  { icon: GraduationCap, title: "Student Account", desc: "After payment, we create the student's login and send it to you directly." },
];

export default function JoinAcademyModal({ isOpen, onClose, onStartTrial }: JoinAcademyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Join EmberKids Chess Academy"
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 text-gray-400 hover:text-black transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-7 sm:px-9 pt-9 pb-7">
              <h2 className="font-serif text-2xl sm:text-3xl text-black mb-2">
                Join Ember<span className="text-[#f85b1c]">Kids</span>
              </h2>
              <p className="text-sm text-gray-500 mb-7">
                Here&apos;s how a child becomes a student at our academy.
              </p>

              <div className="space-y-4 mb-8">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex items-start gap-3.5">
                      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f85b1c]/10 text-[#f85b1c]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-sm font-bold text-black">
                          {i + 1}. {step.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-50 rounded-2xl px-5 py-4 mb-7">
                <p className="text-sm text-gray-600">
                  Student accounts aren&apos;t created by signing up directly — they&apos;re set up by our
                  team once enrollment is confirmed, and login details are sent straight to you by
                  email and WhatsApp.
                </p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onStartTrial();
                }}
                className="group relative overflow-hidden flex items-center justify-center gap-2 w-full rounded-full bg-black text-white py-4 cursor-pointer transition-colors hover:bg-[#f85b1c]"
              >
                <span className="text-sm uppercase tracking-[0.2em] font-medium">Book a Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-5 text-center text-sm text-gray-500">
                Already enrolled?{" "}
                <Link href="/student/login" onClick={onClose} className="font-semibold text-[#f85b1c] hover:underline">
                  Log in to the student portal
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
