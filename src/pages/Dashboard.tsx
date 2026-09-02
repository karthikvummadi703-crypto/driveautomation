import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedPage } from '@/animations/presets';
import { staggerContainer } from '@/animations/variants';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DriveStatus } from '@/components/dashboard/DriveStatus';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { StatCard, StatCardGrid } from '@/components/dashboard/StatCard';
import { StorageUsage } from '@/components/dashboard/StorageUsage';
import { UploadList } from '@/components/dashboard/UploadList';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { FilterBar, type FilterValue } from '@/components/dashboard/FilterBar';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { useUploadData } from '@/hooks/useUploadData';
import { formatGB } from '@/utils/format';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FileIcon,
  HardDriveIcon,
  UploadCloudIcon,
  XCircleIcon,
} from '@/components/ui/Icon';

export default function Dashboard() {
  const { user, profile, profileLoading } = useAuth();
  const uid = user?.uid;
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterValue>({ status: 'all', fileType: 'all', sort: 'newest' });

  const { stats, records, loading, remove } = useUploadData(uid, {
    search,
    status: filters.status,
    fileType: filters.fileType,
    sort: filters.sort,
  });

  const {
    storageUsedBytes: driveUsedBytes,
    storageQuotaBytes: driveQuotaBytes,
    storagePercentage: drivePercentage,
    storageLoading: driveStorageLoading,
    storageUnlimited,
    connected: driveConnected,
    driveEmail,
    connect,
    connecting,
  } = useDrive();

  // ─── Drive storage values — always use real Drive data, never fake fallbacks ───
  const driveDataReady = driveConnected && (driveQuotaBytes !== null || storageUnlimited);
  const storageValueLabel = driveDataReady
    ? formatGB(driveUsedBytes)
    : driveConnected
      ? 'Sync Needed'
      : '—';
  const storageHintLabel = driveDataReady
    ? storageUnlimited
      ? 'Unlimited Drive quota'
      : `of ${formatGB(driveQuotaBytes!)}`
    : driveConnected
      ? 'Click to authorize access'
      : 'Connect Google Drive';

  const fileTypes = useMemo(
    () => Array.from(new Set(records.map((r) => r.fileType))).sort(),
    [records],
  );

  const successRate =
    stats.totalUploads > 0 ? Math.round((stats.successCount / stats.totalUploads) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <AnimatedPage className="space-y-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display text-2xl font-bold text-white sm:text-3xl"
            >
              {greeting}, {profile?.displayName?.split(' ')[0] ?? 'there'} 👋
            </motion.h1>
            <p className="mt-1 text-sm text-slate-400">
              Here's what's happening with your DriveFlow uploads.
            </p>
          </div>
          <Button variant="primary" size="lg" glow onClick={() => navigate(APP_ROUTES.upload)}>
            <UploadCloudIcon size={18} />
            Upload a file
          </Button>
        </div>

        <ProfileCard profile={profile} loading={profileLoading} driveConnected={driveConnected} driveEmail={driveEmail} />
      </div>

      <StatCardGrid>
        <StatCard
          Icon={UploadCloudIcon}
          label="Total uploads"
          value={String(stats.totalUploads)}
          hint="All time"
          gradient="from-electric to-grape"
          loading={loading}
        />
        {/* ── Storage stat — real Drive data only, shown in GB ── */}
        <StatCard
          Icon={HardDriveIcon}
          label="Drive storage used"
          value={storageValueLabel}
          hint={storageHintLabel}
          gradient="from-grape to-grape-100"
          loading={driveStorageLoading}
        />
        <StatCard
          Icon={CheckCircleIcon}
          label="Success rate"
          value={`${successRate}%`}
          hint={`${stats.successCount} successful`}
          gradient="from-emerald-400 to-electric"
          loading={loading}
        />
        <StatCard
          Icon={FileIcon}
          label="File types"
          value={String(new Set(records.map((r) => r.fileType)).size)}
          hint="Across history"
          gradient="from-electric-100 to-grape"
          loading={loading}
        />
      </StatCardGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div
              variants={{}}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10 text-electric">
                  <ClockIcon size={18} />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">Recent uploads</h2>
                  <p className="text-xs text-slate-400">
                    {stats.totalUploads} total · {records.length} shown
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(APP_ROUTES.history)}>
                View all history
                <ArrowRightIcon size={15} />
              </Button>
            </motion.div>

            <motion.div>
              <SearchBar value={search} onChange={setSearch} placeholder="Search recent uploads…" />
            </motion.div>
            <motion.div>
              <FilterBar filters={filters} onChange={setFilters} fileTypes={fileTypes} />
            </motion.div>

            <UploadList
              records={records}
              loading={loading}
              onRemove={remove}
              emptyTitle={search ? 'No matches found' : 'No uploads yet'}
              emptyDescription={
                search
                  ? 'Try a different search term or reset the filters.'
                  : 'Upload your first file and it will appear here instantly.'
              }
            />
          </motion.div>
        </div>

        <div className="space-y-6">
          <StorageUsage
            usedBytes={driveUsedBytes}
            quotaBytes={driveQuotaBytes}
            percentage={drivePercentage}
            loading={driveStorageLoading}
            connected={driveConnected}
            driveEmail={driveEmail}
            onConnect={connect}
            connecting={connecting}
          />

          <DriveStatus />

          <Card className="flex items-center gap-3 p-4 text-sm text-slate-400">
            <XCircleIcon size={16} className="shrink-0 text-slate-500" />
            Failed uploads ({stats.failedCount}) stay in history for retry from the error dialog.
          </Card>
        </div>
      </div>
    </AnimatedPage>
  );
}
