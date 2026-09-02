import { cn } from '@/utils/cn';

export interface ProgressBarProps {
  value: number;
  className?: string;
  barClassName?: string;
  gradient?: boolean;
  striped?: boolean;
  ariaLabel?: string;
}

export function ProgressBar({
  value,
  className,
  barClassName,
  gradient = true,
  striped = true,
  ariaLabel = 'Progress',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-white/10', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300 ease-out',
          gradient
            ? 'bg-gradient-to-r from-electric via-electric-100 to-grape'
            : 'bg-electric',
          striped && 'progress-stripes',
          barClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
