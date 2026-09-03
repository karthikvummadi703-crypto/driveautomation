import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatedPage } from '@/animations/presets';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/services/api';
import { APP_ROUTES } from '@/config/constants';
import {
  GoogleDriveIcon,
  ShieldIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/ui/Icon';

export default function ConnectDrive() {
  const { isGoogleUser } = useAuth();
  const { connected, connecting, connect, driveEmail } = useDrive();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'intro' | 'connecting' | 'success'>('intro');

  const from = (location.state as { from?: string })?.from || APP_ROUTES.dashboard;

  // Surface the result of a server-side OAuth redirect (status query param).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'error') {
      const reason = params.get('reason');
      setStep('intro');
      if (reason === 'invalid_state') {
        setError('The Google Drive connection request was invalid or had expired. Please try again.');
      } else if (reason === 'missing_code') {
        setError('Google did not return an authorization code. Please try again.');
      } else if (reason?.startsWith('oauth_error')) {
        setError(`Google authorization was not completed (${reason.replace('oauth_error:', '')}).`);
      } else if (reason === 'token_exchange_failed') {
        setError('Could not complete the Google Drive connection. Check that GOOGLE_CLIENT_SECRET is configured.');
      } else {
        setError('The Google Drive connection could not be completed. Please try again.');
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (connected) {
      setStep('success');
      const timer = setTimeout(() => {
        navigate(from, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connected, navigate, from]);

  const handleConnect = async () => {
    setError(null);
    setStep('connecting');
    try {
      await connect();
      success('Google Drive connected successfully!', 'You can now upload files to your personal Drive.');
    } catch (err) {
      setStep('intro');
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError('Connection failed', errorMessage);
    }
  };

  const handleSkip = () => {
    navigate(APP_ROUTES.settings, { replace: true });
  };

  if (step === 'success') {
    return (
      <AnimatedPage className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircleIcon size={32} />
          </div>
          <h2 className="font-display text-2xl font-bold text-white">Drive Connected!</h2>
          <p className="mt-2 text-slate-400">
            {driveEmail ? `Connected as ${driveEmail}` : 'Your Google Drive is now connected'}
          </p>
          <p className="mt-4 text-sm text-slate-500">Redirecting to dashboard...</p>
        </Card>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="mx-auto max-w-2xl space-y-8 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-electric to-grape text-white shadow-glow">
          <GoogleDriveIcon size={32} />
        </div>
        <h1 className="font-display text-3xl font-bold text-white">Connect Google Drive</h1>
        <p className="mt-2 text-slate-400">
          {isGoogleUser 
            ? 'Complete your setup by connecting your Google Drive to enable file uploads.'
            : 'To use DriveFlow, you need to connect a Google Drive account for file storage.'}
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-electric/20 bg-electric/5 p-4">
          <ShieldIcon size={20} className="mt-0.5 shrink-0 text-electric" />
          <div className="text-sm leading-relaxed text-slate-300">
            <p className="font-medium text-white">Your files, your Drive</p>
            <p className="mt-1">
              Files are uploaded directly to <span className="font-medium text-white">your personal Google Drive</span> — 
              not a shared pool. You maintain full control and ownership of all your files.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-electric/20 text-electric">
              <span className="text-xs font-bold">1</span>
            </div>
            <div>
              <p className="font-medium text-white">Secure OAuth Connection</p>
              <p className="text-sm text-slate-400">
                We use Google's secure OAuth system. You'll be redirected to Google's official authorization page.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-electric/20 text-electric">
              <span className="text-xs font-bold">2</span>
            </div>
            <div>
              <p className="font-medium text-white">Least-Privilege Access</p>
              <p className="text-sm text-slate-400">
                We only request access to manage files created by this app. We can't access your existing files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-electric/20 text-electric">
              <span className="text-xs font-bold">3</span>
            </div>
            <div>
              <p className="font-medium text-white">Cross-Device Sync</p>
              <p className="text-sm text-slate-400">
                Once connected, your Drive connection works on any device where you sign in to DriveFlow.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4">
            <AlertTriangleIcon size={20} className="mt-0.5 shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="font-medium text-rose-400">Connection Error</p>
              <p className="mt-1 text-sm text-slate-300">{error}</p>
              <div className="mt-3 rounded-lg bg-slate-800/50 p-3">
                <p className="text-xs font-medium text-white">How to proceed:</p>
                <ol className="mt-2 text-xs text-slate-400 list-decimal list-inside space-y-1">
                  <li>Click "Advanced" on the Google warning screen</li>
                  <li>Click "Go to DriveFlow (unsafe)" to continue</li>
                  <li>This is normal during development</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleConnect}
            loading={connecting || step === 'connecting'}
            variant="primary"
            size="lg"
            fullWidth
            glow
          >
            <GoogleDriveIcon size={18} />
            {isGoogleUser ? 'Connect Google Drive' : 'Link Google Drive Account'}
          </Button>

          {!isGoogleUser && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="lg"
              fullWidth
              disabled={connecting}
            >
              I'll connect later
              <ArrowRightIcon size={15} />
            </Button>
          )}
        </div>
      </Card>

      <div className="text-center">
        <p className="text-xs text-slate-500">
          By connecting, you agree to Google's Terms of Service and DriveFlow's Privacy Policy.
        </p>
      </div>
    </AnimatedPage>
  );
}