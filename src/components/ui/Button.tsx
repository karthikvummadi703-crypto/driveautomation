import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  glow?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-electric to-grape text-white shadow-glow hover:shadow-glow-lg hover:brightness-110 focus-visible:ring-electric',
  secondary:
    'bg-white/10 text-white backdrop-blur border border-white/10 hover:bg-white/15 focus-visible:ring-white/40',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/10 focus-visible:ring-white/40',
  outline:
    'border border-electric/50 text-electric hover:bg-electric/10 hover:border-electric focus-visible:ring-electric',
  danger:
    'bg-rose-500/10 text-rose-300 border border-rose-400/30 hover:bg-rose-500/20 focus-visible:ring-rose-400',
  link: 'text-electric hover:text-electric-100 underline-offset-4 hover:underline',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
  xl: 'h-14 px-8 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    glow = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl font-semibold transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900',
        'disabled:cursor-not-allowed disabled:opacity-60',
        glow && variant === 'primary' && 'animate-pulse-ring',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </motion.button>
  );
});
