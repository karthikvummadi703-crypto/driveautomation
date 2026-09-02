import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyUploadQuery,
  computeUploadStats,
  fetchUserRecords,
  removeUploadRecord,
} from '@/services/firestoreService';
import { STORAGE_QUOTA_BYTES } from '@/config/constants';
import type { UploadHistoryQuery, UploadRecord, UploadStats } from '@/types/upload';

const EMPTY_STATS: UploadStats = {
  totalUploads: 0,
  totalSize: 0,
  successCount: 0,
  failedCount: 0,
  recentUploads: [],
};

interface UseUploadDataOptions extends UploadHistoryQuery {
  displayLimit?: number;
}

interface UseUploadDataResult {
  records: UploadRecord[];
  stats: UploadStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  remove: (recordId: string) => Promise<void>;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storagePercentage: number;
}

export function useUploadData(
  uid: string | undefined,
  options: UseUploadDataOptions = {},
): UseUploadDataResult {
  const { displayLimit = 100, ...queryOptions } = options;
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [stats, setStats] = useState<UploadStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const refresh = useCallback(async () => {
    if (!uid) {
      setRecords([]);
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all = await fetchUserRecords(uid);
      const filtered = applyUploadQuery(all, optionsRef.current);
      setRecords(filtered.slice(0, displayLimit));
      setStats(computeUploadStats(all, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upload data.');
    } finally {
      setLoading(false);
    }
  }, [uid, displayLimit]);

  useEffect(() => {
    void refresh();
  }, [
    refresh,
    uid,
    queryOptions.search,
    queryOptions.status,
    queryOptions.fileType,
    queryOptions.sort,
  ]);

  const remove = useCallback(
    async (recordId: string) => {
      if (!uid) return;
      await removeUploadRecord(uid, recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    },
    [uid],
  );

  const storageUsedBytes = stats.totalSize;
  const storagePercentage = Math.min(
    100,
    Math.round((storageUsedBytes / STORAGE_QUOTA_BYTES) * 1000) / 10,
  );

  return {
    records,
    stats,
    loading,
    error,
    refresh,
    remove,
    storageUsedBytes,
    storageQuotaBytes: STORAGE_QUOTA_BYTES,
    storagePercentage,
  };
}
