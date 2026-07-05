import { Transition } from "framer-motion";

const easeOut: Transition = { ease: [0.22, 1, 0.36, 1] };

// Shared animation variants for consistent, lightweight motion across the application.
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ...easeOut },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ...easeOut },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ...easeOut },
  },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.65, ...easeOut },
  },
};

export const stagger = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.1,
    },
  },
};

export const staggerFast = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.02,
      staggerChildren: 0.07,
    },
  },
};

export const viewportConfig = {
  once: true,
  margin: "-90px",
};

export const pageIntro = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ...easeOut },
  },
};

// Aliases for backward compatibility
export const fadeUpVariant = fadeUp;
export const staggerContainer = stagger;
