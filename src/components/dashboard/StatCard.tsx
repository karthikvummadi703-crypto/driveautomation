import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { fadeInUp, staggerContainer } from '@/animations/variants';
import type { IconProps } from '@/components/ui/Icon';

export interface StatCardProps {
  Icon: ComponentType<IconProps>;
  label: string;
  value: string;
  hint?: string;
  gradient: string;
  loading?: boolean;
}

export function StatCard({ Icon, label, value, hint, gradient, loading }: StatCardProps) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="relative overflow-hidden p-5">
        <div className="flex items-start justify-between">
          <div>
            {loading ? (
              <>
                <Skeleton className="mb-2 h-4 w-16" />
                <Skeleton className="h-8 w-24" />
              </>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                <p className="font-display mt-2 text-2xl font-bold text-white">{value}</p>
                {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
              </>
            )}
          </div>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-glow`}
          >
            <Icon size={20} />
          </span>
        </div>
        <div
          className={`pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl`}
        />
      </Card>
    </motion.div>
  );
}

export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {children}
    </motion.div>
  );
}
