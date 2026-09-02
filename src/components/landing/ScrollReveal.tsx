import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { viewportOnce, EASE_OUT } from '@/animations/variants';

export interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
  duration?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  delay = 0,
  y = 28,
  x = 0,
  scale = 1,
  duration = 0.6,
  className,
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();
  const distance = reduceMotion ? 0 : y;

  return (
    <motion.div
      initial={{ opacity: 0, y: distance, x, scale }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={viewportOnce}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
