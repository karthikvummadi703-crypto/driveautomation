import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { Spinner } from '@/components/ui/Spinner';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-electric to-grape text-white shadow-glow">
          <Spinner className="h-6 w-6" />
        </span>
      </div>
      <p className="text-sm text-slate-400">Loading DriveFlow…</p>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isEmailVerified, authLoading, profileLoading, isGoogleUser } = useAuth();
  const { connected, driveLoading } = useDrive();
  const location = useLocation();

  if (authLoading || profileLoading || driveLoading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: location.pathname }} />;
  }
  if (!isEmailVerified) {
    return <Navigate to={APP_ROUTES.verifyEmail} replace state={{ from: location.pathname }} />;
  }
  
  // Force Drive connection for email users before accessing protected routes
  if (!isGoogleUser && !connected) {
    return <Navigate to={APP_ROUTES.connectDrive} replace state={{ 
      from: location.pathname 
    }} />;
  }
  
  return <>{children}</>;
}

export function EmailVerificationRoute({ children }: { children: ReactNode }) {
  const { user, isEmailVerified, authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to={APP_ROUTES.login} replace />;
  }
  if (isEmailVerified) {
    return <Navigate to={APP_ROUTES.dashboard} replace />;
  }
  return <>{children}</>;
}

export function AuthenticatedOnlyRoute({ children }: { children: ReactNode }) {
  const { user, isEmailVerified, authLoading, profileLoading } = useAuth();
  const location = useLocation();

  if (authLoading || profileLoading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: location.pathname }} />;
  }
  if (!isEmailVerified) {
    return <Navigate to={APP_ROUTES.verifyEmail} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, isEmailVerified, authLoading } = useAuth();

  if (authLoading) return <FullScreenLoader />;
  if (user) {
    if (!isEmailVerified) {
      return <Navigate to={APP_ROUTES.verifyEmail} replace />;
    }
    return <Navigate to={APP_ROUTES.dashboard} replace />;
  }
  return <>{children}</>;
}
