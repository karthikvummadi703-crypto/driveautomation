import { useCallback, useEffect, useState } from 'react';
import { getUploadStats } from '@/services/firestoreService';
import { STORAGE_QUOTA_BYTES } from '@/config/constants';
import type { UploadStats } from '@/types/upload';

interface UseStorageStatsResult {
  stats: UploadStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storagePercentage: number;
}

const EMPTY_STATS: UploadStats = {
  totalUploads: 0,
  totalSize: 0,
  successCount: 0,
  failedCount: 0,
  recentUploads: [],
};

export function useStorageStats(uid: string | undefined): UseStorageStatsResult {
  const [stats, setStats] = useState<UploadStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUploadStats(uid, 5);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const storageUsedBytes = stats.totalSize;
  const storagePercentage = Math.min(
    100,
    Math.round((storageUsedBytes / STORAGE_QUOTA_BYTES) * 1000) / 10,
  );

  return {
    stats,
    loading,
    error,
    refresh,
    storageUsedBytes,
    storageQuotaBytes: STORAGE_QUOTA_BYTES,
    storagePercentage,
  };
}
