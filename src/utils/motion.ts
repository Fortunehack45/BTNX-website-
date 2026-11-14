import type { Variants } from "motion/react";

export const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

export const EDITORIAL_VIEWPORT = {
  once: true,
  amount: 0.08,
} as const;

export const galleryContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.04,
    },
  },
};

export const galleryCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: EDITORIAL_EASE,
    },
  },
};

export const modalBackdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.24,
      ease: EDITORIAL_EASE,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.18,
      ease: EDITORIAL_EASE,
    },
  },
};

export const modalPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: EDITORIAL_EASE,
      staggerChildren: 0.045,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.99,
    transition: {
      duration: 0.18,
      ease: EDITORIAL_EASE,
    },
  },
};

export const modalItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: EDITORIAL_EASE,
    },
  },
};
