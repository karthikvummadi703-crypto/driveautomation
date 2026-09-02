import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { APP_ROUTES } from '@/config/constants';
import { cn } from '@/utils/cn';
import type { IconProps } from '@/components/ui/Icon';

export interface AuthShellProps {
  title: string;
  description: string;
  Icon: ComponentType<IconProps>;
  children: React.ReactNode;
  footer: React.ReactNode;
  accent?: string;
}

export function AuthShell({ title, description, Icon, children, footer, accent = 'from-electric to-grape' }: AuthShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-navy-800/80 p-8 shadow-card backdrop-blur-xl sm:p-10"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-grape/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-electric/20 blur-3xl" />

      <div className="relative">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="md" />
          <span className={cn('mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-glow', accent)}>
            <Icon size={22} />
          </span>
          <h1 className="font-display mt-5 text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        </div>

        {children}

        <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>
      </div>
    </motion.div>
  );
}

export function BackToHome() {
  return (
    <p className="mt-6 text-center text-sm text-slate-500">
      <Link to={APP_ROUTES.home} className="text-slate-400 transition hover:text-electric">
        ← Back to home
      </Link>
    </p>
  );
}
