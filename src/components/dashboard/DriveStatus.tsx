import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GoogleDriveIcon } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { getErrorMessage } from '@/services/api';

export function DriveStatus() {
  const { isGoogleUser } = useAuth();
  const { driveLoading, connected, driveEmail, connecting, connect } = useDrive();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (driveLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 animate-pulse rounded-xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <span className="block h-4 w-2/5 animate-pulse rounded bg-white/10" />
            <span className="block h-3 w-3/5 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </Card>
    );
  }

  if (connected) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <GoogleDriveIcon size={20} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">Drive connected</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Uploads land directly in your own Google Drive{driveEmail ? ` (${driveEmail})` : ''} — on this device and any other device where you sign in.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-medium text-emerald-300">Ready to upload</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-electric/10 text-electric">
          <GoogleDriveIcon size={20} />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-base font-semibold text-white">
            {isGoogleUser ? 'Connect your Drive' : 'Link a Google Drive'}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            {isGoogleUser
              ? 'Connect once — Google asks for permission on its own page, and your connection is saved to your account.'
              : 'Sign in with the Google account whose Drive you want to use. No Google Drive means no uploads.'}
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={handleConnect} loading={connecting}>
              <GoogleDriveIcon size={15} />
              {isGoogleUser ? 'Connect Google Drive' : 'Link Google Drive'}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-rose-400" role="alert">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
