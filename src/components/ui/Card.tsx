import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  glass?: boolean;
  hover?: boolean;
  children: ReactNode;
}

export function Card({
  gradient = false,
  glass = false,
  hover = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border',
        gradient
          ? 'border-white/10 bg-gradient-to-br from-midnight via-navy-800 to-grape/20 shadow-card'
          : glass
            ? 'border-white/10 bg-white/5 shadow-glass backdrop-blur-xl'
            : 'border-white/10 bg-navy-800/70 shadow-card',
        hover &&
          'transition-transform duration-300 hover:-translate-y-1.5 hover:border-electric/40 hover:shadow-glow',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
