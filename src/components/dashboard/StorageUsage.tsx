import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatGB } from '@/utils/format';
import { HardDriveIcon, GoogleDriveIcon } from '@/components/ui/Icon';

export interface StorageUsageProps {
  usedBytes: number;
  quotaBytes: number | null;
  percentage: number;
  loading?: boolean;
  driveEmail?: string | null;
  connected?: boolean;
  onConnect?: () => void;
  connecting?: boolean;
}

export function StorageUsage({
  usedBytes,
  quotaBytes,
  percentage,
  loading,
  driveEmail,
  connected,
  onConnect,
  connecting,
}: StorageUsageProps) {
  // Show a connect card when Drive is truly not connected
  if (!connected && !loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-slate-400">
            <HardDriveIcon size={20} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">Storage</h3>
            <p className="text-xs text-slate-500">Connect Google Drive to see your storage</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" size="sm" onClick={onConnect} loading={connecting} className="w-full">
            Connect Google Drive
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-grape text-white shadow-glow">
            <HardDriveIcon size={20} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">Drive Storage</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <GoogleDriveIcon size={11} />
              {driveEmail ? driveEmail : 'Google Drive'}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-electric/10 px-3 py-1 text-xs font-semibold text-electric">
          {percentage}%
        </span>
      </div>

      {loading ? (
        <Skeleton className="mt-6 h-2.5 w-full" />
      ) : (
        <ProgressBar
          value={percentage}
          className="mt-6 h-3"
          ariaLabel={`${percentage}% of Google Drive storage used`}
        />
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        <p className="text-slate-300">
          <span className="font-semibold text-white">{formatGB(usedBytes)}</span> used
        </p>
        <p className="text-slate-500">
          {quotaBytes !== null ? `of ${formatGB(quotaBytes)}` : 'Unlimited quota'}
        </p>
      </div>
    </Card>
  );
}
