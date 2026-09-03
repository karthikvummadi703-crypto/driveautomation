import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell, BackToHome } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/services/api';
import { CheckCircleIcon, MailIcon, RefreshCwIcon, LogOutIcon } from '@/components/ui/Icon';

export default function VerifyEmail() {
  const { user, isEmailVerified, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const { success, error: showError, info } = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // If email is already verified, redirect to the dashboard. Done in an effect
  // (not during render) to avoid React's "cannot update a component while
  // rendering a different component" warning.
  useEffect(() => {
    if (isEmailVerified) {
      navigate(APP_ROUTES.dashboard, { replace: true });
    }
  }, [isEmailVerified, navigate]);

  if (isEmailVerified) {
    return null;
  }

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await reloadUser();
      if (user?.emailVerified) {
        success('Email verified!', 'Your email has been verified successfully.');
        navigate(APP_ROUTES.dashboard, { replace: true });
      } else {
        info('Not verified yet', 'Please check your email inbox and click the verification link.');
      }
    } catch (err) {
      showError('Verification check failed', getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setSending(true);
    try {
      await sendVerificationEmail();
      success('Email sent!', `A new verification link was sent to ${user?.email || 'your email'}.`);
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      showError('Could not resend email', getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate(APP_ROUTES.login);
    } catch (err) {
      showError('Sign out failed', getErrorMessage(err));
    }
  };

  return (
    <>
      <AuthShell
        title="Verify your email address"
        description="We sent a verification link to your email. Please verify your email to access DriveFlow."
        Icon={MailIcon}
        footer={
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 font-medium text-slate-400 transition hover:text-white"
          >
            <LogOutIcon size={16} />
            Sign out / Use another account
          </button>
        }
      >
        <div className="rounded-2xl border border-electric/20 bg-electric/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-400">Sent to email address</p>
          <p className="mt-1 font-semibold text-white">{user?.email || 'Your account email'}</p>
        </div>

        <div className="mt-4 rounded-xl border border-electric/20 bg-electric/5 p-4">
          <h3 className="font-medium text-white mb-2">Quick verification steps:</h3>
          <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
            <li>Check your email inbox for the verification link</li>
            <li>Click the link in the email to verify</li>
            <li>Return here and click "I've Verified My Email"</li>
            <li>Don't see the email? Check spam/junk folder</li>
          </ol>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            loading={checking}
            onClick={handleCheckStatus}
          >
            <CheckCircleIcon size={18} />
            I've Verified My Email
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            loading={sending}
            disabled={cooldown > 0}
            onClick={handleResend}
          >
            <RefreshCwIcon size={18} />
            {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend Verification Email'}
          </Button>
        </div>
      </AuthShell>
      <BackToHome />
    </>
  );
}
