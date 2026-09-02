import type { MotionProps, Transition } from 'framer-motion';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export const pageTransition: MotionProps = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export const modalTransition: Transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
};

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
};

export interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return (
    <motion.div {...pageTransition} className={className}>
      {children}
    </motion.div>
  );
}
