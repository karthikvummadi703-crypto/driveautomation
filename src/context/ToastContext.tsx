import { AnimatePresence, motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from '@/components/ui/Icon';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastType, { ring: string; icon: ReactNode }> = {
  success: {
    ring: 'border-emerald-400/40',
    icon: <CheckCircleIcon className="h-5 w-5 text-emerald-400" />,
  },
  error: {
    ring: 'border-rose-400/40',
    icon: <XCircleIcon className="h-5 w-5 text-rose-400" />,
  },
  info: {
    ring: 'border-electric/40',
    icon: <InfoIcon className="h-5 w-5 text-electric" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (title, description) => push('success', title, description),
      error: (title, description) => push('error', title, description),
      info: (title, description) => push('info', title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4 sm:items-end sm:right-6"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toastItem) => {
            const style = TOAST_STYLES[toastItem.type];
            return (
              <motion.div
                key={toastItem.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 48, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border ${style.ring} border-white/10 bg-navy-800/95 p-4 shadow-card backdrop-blur-xl`}
                role="status"
              >
                <span className="mt-0.5 shrink-0">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{toastItem.title}</p>
                  {toastItem.description && (
                    <p className="mt-0.5 text-sm text-slate-300">{toastItem.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toastItem.id)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider.');
  }
  return context;
}
