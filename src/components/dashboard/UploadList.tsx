import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getFileTypeIcon, LinkIcon, TrashIcon } from '@/components/ui/Icon';
import { useToast } from '@/hooks/useToast';
import { formatBytes, timeAgo, truncateFileName } from '@/utils/format';
import type { UploadRecord } from '@/types/upload';

export interface UploadListProps {
  records: UploadRecord[];
  loading?: boolean;
  onRemove?: (recordId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function UploadList({
  records,
  loading = false,
  onRemove,
  emptyTitle = 'No uploads yet',
  emptyDescription = 'Your uploaded files will appear here with their Drive links.',
}: UploadListProps) {
  const { success } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
          <LinkIcon size={24} />
        </span>
        <h3 className="font-display mt-4 text-lg font-semibold text-white">{emptyTitle}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-400">{emptyDescription}</p>
      </div>
    );
  }

  const copyLink = async (record: UploadRecord) => {
    try {
      await navigator.clipboard.writeText(record.driveLink);
      setCopiedId(record.id);
      success('Link copied', record.fileName);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.open(record.driveLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <ul className="space-y-3">
      <AnimatePresence initial={false}>
        {records.map((record) => {
          const FileIcon = getFileTypeIcon(record.fileType, record.fileName);
          const isCopied = copiedId === record.id;
          return (
            <motion.li
              key={record.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-electric/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-electric/10 text-electric">
                <FileIcon size={20} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-white" title={record.fileName}>
                    {truncateFileName(record.fileName)}
                  </p>
                  <Badge variant={record.status === 'success' ? 'success' : 'error'}>
                    {record.status}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {formatBytes(record.fileSize)} · {timeAgo(record.uploadedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => copyLink(record)}
                  aria-label={isCopied ? 'Copied' : `Copy link for ${record.fileName}`}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-electric/40 hover:text-electric"
                >
                  {isCopied ? (
                    <span className="text-xs font-semibold text-electric">Copied</span>
                  ) : (
                    <LinkIcon size={16} />
                  )}
                </button>
                <a
                  href={record.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${record.fileName} in Drive`}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-electric/40 hover:text-electric"
                >
                  <LinkIcon size={16} className="-rotate-45" />
                </a>
                {onRemove && (
                  <button
                    onClick={() => onRemove(record.id)}
                    aria-label={`Delete ${record.fileName} from history`}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-rose-400/40 hover:text-rose-400"
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
