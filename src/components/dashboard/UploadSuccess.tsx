import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { formatBytes } from '@/utils/format';
import { CopyIcon, ExternalLinkIcon, RefreshCwIcon, XIcon } from '@/components/ui/Icon';
import type { UploadRecord } from '@/types/upload';

export interface UploadSuccessProps {
  record: UploadRecord | null;
  onClose: () => void;
  onUploadAnother: () => void;
}

export function UploadSuccess({ record, onClose, onUploadAnother }: UploadSuccessProps) {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (record) setCopied(false);
  }, [record]);

  const copyLink = async () => {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record.driveLink);
      setCopied(true);
      success('Link copied to clipboard');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(record.driveLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Upload successful"
    >
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/30 bg-navy-800 p-8 text-center shadow-card"
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />

        <svg viewBox="0 0 96 96" className="mx-auto h-24 w-24" aria-hidden="true">
          <motion.circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="url(#uploadSuccessGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="uploadSuccessGradient" x1="0" y1="0" x2="96" y2="96">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#4CC9F0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M32 50l12 12 20-24"
            fill="none"
            stroke="url(#uploadSuccessGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
          />
        </svg>

        <h2 className="font-display mt-6 text-2xl font-bold text-white">Upload complete!</h2>
        <p className="mt-2 text-sm text-slate-400">
          {record?.fileName} · {formatBytes(record?.fileSize ?? 0)} saved to your Google Drive.
        </p>

        {record?.driveLink && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 pl-4">
            <p className="min-w-0 flex-1 truncate text-left text-xs text-slate-400">{record.driveLink}</p>
            <button
              onClick={copyLink}
              aria-label="Copy Drive link"
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-electric/40 hover:text-electric"
            >
              {copied ? <RefreshCwIcon size={16} className="text-electric" /> : <CopyIcon size={16} />}
            </button>
            <a
              href={record.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in Google Drive"
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-electric/40 hover:text-electric"
            >
              <ExternalLinkIcon size={16} />
            </a>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" fullWidth onClick={onUploadAnother}>
            Upload another file
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            <XIcon size={16} />
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
