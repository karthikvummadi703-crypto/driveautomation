import { useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GoogleDriveIcon, ShieldIcon } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { getErrorMessage } from '@/services/api';

export interface DriveGateProps {
  children: ReactNode;
}

export function DriveGate({ children }: DriveGateProps) {
  const { profile, profileLoading, isGoogleUser } = useAuth();
  const { connected, connecting, connect } = useDrive();
  const [error, setError] = useState<string | null>(null);

  if (profileLoading || !profile) return null;

  if (connected) return <>{children}</>;

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      {children}
      <Modal
        open
        onClose={() => undefined}
        dismissible={false}
        title={isGoogleUser ? 'Connect your Google Drive' : 'Connect a Google Drive account'}
        description={
          isGoogleUser
            ? 'Files are uploaded straight to your own Google Drive — not a shared pool. Grant once and it works from any device.'
            : 'Your account has no linked Drive yet. Sign in with the Google account whose Drive you want to use — uploads go only to that account’s own Drive.'
        }
        footer={
          <Button onClick={handleConnect} loading={connecting}>
            <GoogleDriveIcon size={16} />
            {isGoogleUser ? 'Connect Google Drive' : 'Link Google Drive'}
          </Button>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-electric/20 bg-electric/5 p-4">
          <ShieldIcon size={20} className="mt-0.5 shrink-0 text-electric" />
          <p className="text-sm leading-relaxed text-slate-300">
            A Google permission page will open in a popup. Approve it once with{' '}
            <span className="font-medium text-white">your</span> Google account and your connection is
            saved to your profile — it works on every device where you sign in, using the least-privilege{' '}
            <span className="font-mono text-xs text-electric">drive.file</span> scope.
            {!isGoogleUser && (
              <>
                {' '}
                If the email you used to sign in has no Google Drive, you won’t be able to upload.
              </>
            )}{' '}
            You can disconnect at any time from Settings.
          </p>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-rose-400/10 p-3">
            <p className="text-sm text-rose-400" role="alert">{error}</p>
            {error.toLowerCase().includes('unverified') && (
              <p className="mt-2 text-xs text-slate-400">
                💡 Click "Advanced" → "Go to DriveFlow (unsafe)" on the Google screen to proceed. This is normal during development.
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
