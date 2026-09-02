import { cn } from '@/utils/cn';

export interface SkeletonProps {
  className?: string;
  rounded?: string;
}

export function Skeleton({ className, rounded = 'rounded-xl' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-white/10',
        rounded,
        className,
      )}
    />
  );
}
