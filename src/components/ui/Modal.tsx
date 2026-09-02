import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { XIcon } from './Icon';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? 'Dialog'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            aria-label="Close dialog"
            className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
            onClick={onClose}
            tabIndex={-1}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'relative w-full overflow-hidden rounded-2xl border border-white/10 bg-navy-800 shadow-card',
              SIZES[size],
            )}
          >
            <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-electric/20 blur-3xl" />
            {(title || dismissible) && (
              <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
                <div>
                  {title && <h2 className="font-display text-lg font-semibold text-white">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
                </div>
                {dismissible && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <XIcon size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="relative px-6 py-5">{children}</div>
            {footer && (
              <div className="relative flex justify-end gap-3 border-t border-white/10 bg-navy-900/50 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
