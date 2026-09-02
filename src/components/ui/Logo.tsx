import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { APP_ROUTES } from '@/config/constants';

export interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const SIZES = {
  sm: { box: 'h-8 w-8', text: 'text-lg' },
  md: { box: 'h-10 w-10', text: 'text-xl' },
  lg: { box: 'h-12 w-12', text: 'text-2xl' },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const s = SIZES[size];
  return (
    <Link
      to={APP_ROUTES.home}
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="DriveFlow home"
    >
      <span
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-electric to-grape shadow-glow transition-transform duration-300 group-hover:scale-105',
          s.box,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[55%] w-[55%]"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l-4.5 3v12l4.5 3 4.5-3V6L12 3z" opacity={0.4} />
          <path d="M4 14l5-3 4 4 3.5-2.5L20 15.5" />
          <circle cx="15" cy="8" r="1.8" fill="white" stroke="none" />
        </svg>
        <span className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </span>
      {showText && (
        <span
          className={cn(
            'font-display font-bold tracking-tight text-white',
            s.text,
          )}
        >
          Drive<span className="bg-gradient-to-r from-electric to-electric-100 bg-clip-text text-transparent">Flow</span>
        </span>
      )}
    </Link>
  );
}
