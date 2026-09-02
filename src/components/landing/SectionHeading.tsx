import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ScrollReveal } from './ScrollReveal';

export interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('mb-14', align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      <ScrollReveal>
        <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-electric">
          <span className="h-1.5 w-1.5 rounded-full bg-electric" />
          {eyebrow}
        </span>
      </ScrollReveal>
      <ScrollReveal delay={0.1}>
        <h2 className="font-display mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h2>
      </ScrollReveal>
      {description && (
        <ScrollReveal delay={0.2}>
          <p className="mt-5 text-base leading-relaxed text-slate-400 sm:text-lg">{description}</p>
        </ScrollReveal>
      )}
    </div>
  );
}
