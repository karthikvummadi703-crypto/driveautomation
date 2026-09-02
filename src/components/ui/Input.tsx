import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { AlertTriangleIcon } from './Icon';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-300 dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full rounded-xl border bg-white/5 text-sm text-white placeholder:text-slate-500',
            'transition-all duration-200 focus:outline-none focus:ring-2',
            leftIcon ? 'pl-11' : 'pl-4',
            rightSlot ? 'pr-11' : 'pr-4',
            error
              ? 'border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/30'
              : 'border-white/10 focus:border-electric focus:ring-electric/30 hover:border-white/20',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {rightSlot && <span className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</span>}
      </div>
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            id={`${inputId}-error`}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400"
            role="alert"
          >
            <AlertTriangleIcon size={13} />
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="mb-1.5 block text-sm font-medium text-slate-300 dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          'w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500',
          'transition-all duration-200 focus:outline-none focus:ring-2',
          error
            ? 'border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/30'
            : 'border-white/10 focus:border-electric focus:ring-electric/30',
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400" role="alert">
          <AlertTriangleIcon size={13} />
          {error}
        </p>
      )}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});
