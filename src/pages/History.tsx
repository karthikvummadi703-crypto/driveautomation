import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { AnimatedPage } from '@/animations/presets';
import { Button } from '@/components/ui/Button';
import { FilterBar, type FilterValue } from '@/components/dashboard/FilterBar';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { UploadList } from '@/components/dashboard/UploadList';
import { useAuth } from '@/hooks/useAuth';
import { useUploadHistory } from '@/hooks/useUploadHistory';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/services/api';
import { clearUploadHistory } from '@/services/firestoreService';
import { ClockIcon, RefreshCwIcon, TrashIcon } from '@/components/ui/Icon';

export default function History() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { success, error: showError } = useToast();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterValue>({ status: 'all', fileType: 'all', sort: 'newest' });

  const { records, loading, error, refresh, remove } = useUploadHistory(uid, {
    search,
    status: filters.status,
    fileType: filters.fileType,
    sort: filters.sort,
  });

  const fileTypes = useMemo(
    () => Array.from(new Set(records.map((r) => r.fileType))).sort(),
    [records],
  );

  const handleClearAll = async () => {
    if (!uid) return;
    try {
      await clearUploadHistory(uid);
      await refresh();
      success('Upload history cleared');
    } catch (err) {
      showError('Could not clear history', getErrorMessage(err));
    }
  };

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-2xl font-bold text-white sm:text-3xl"
          >
            Upload history
          </motion.h1>
          <p className="mt-1 text-sm text-slate-400">
            {records.length} record{records.length === 1 ? '' : 's'} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            <RefreshCwIcon size={15} />
            Refresh
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={records.length === 0}
            onClick={() => {
              if (window.confirm('Clear your entire upload history? This cannot be undone.')) {
                void handleClearAll();
              }
            }}
          >
            <TrashIcon size={15} />
            Clear all
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <FilterBar filters={filters} onChange={setFilters} fileTypes={fileTypes} />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-center">
          <p className="text-sm text-rose-300">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      ) : (
        <UploadList
          records={records}
          loading={loading}
          onRemove={(id) => {
            void remove(id);
            success('Upload removed from history');
          }}
          emptyTitle={search ? 'No matching uploads' : 'No uploads yet'}
          emptyDescription={
            search
              ? 'No files match your search. Clear the search to see everything.'
              : 'Your upload history is empty. Head to the upload page to add your first file.'
          }
        />
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        <ClockIcon size={14} className="shrink-0 text-electric" />
        History is stored per user in the Firestore <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono">uploadHistory</code> collection.
      </div>
    </AnimatedPage>
  );
}
