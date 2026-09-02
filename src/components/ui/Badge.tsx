import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeVariant = 'success' | 'error' | 'info' | 'warning' | 'neutral' | 'gradient';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  error: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
  info: 'bg-electric/10 text-electric border-electric/30',
  warning: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  neutral: 'bg-white/10 text-slate-300 border-white/15',
  gradient: 'bg-gradient-to-r from-electric/20 to-grape/20 text-white border-electric/30',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
