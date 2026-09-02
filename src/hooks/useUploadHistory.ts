import { useCallback, useEffect, useRef, useState } from 'react';
import { getUploadRecords, removeUploadRecord } from '@/services/firestoreService';
import type { UploadHistoryQuery, UploadRecord } from '@/types/upload';

interface UseUploadHistoryResult {
  records: UploadRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  remove: (recordId: string) => Promise<void>;
}

export function useUploadHistory(uid: string | undefined, queryOptions: UploadHistoryQuery = {}): UseUploadHistoryResult {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryRef = useRef(queryOptions);

  useEffect(() => {
    queryRef.current = queryOptions;
  }, [queryOptions]);

  const refresh = useCallback(async () => {
    if (!uid) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUploadRecords(uid, queryRef.current, 100);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upload history.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh, uid, queryOptions.search, queryOptions.status, queryOptions.fileType, queryOptions.sort]);

  const remove = useCallback(
    async (recordId: string) => {
      if (!uid) return;
      await removeUploadRecord(uid, recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    },
    [uid],
  );

  return { records, loading, error, refresh, remove };
}
