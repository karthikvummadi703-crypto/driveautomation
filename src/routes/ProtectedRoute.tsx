import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
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
  const { user, authLoading, profileLoading } = useAuth();
  const location = useLocation();

  if (authLoading || profileLoading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth();

  if (authLoading) return <FullScreenLoader />;
  if (user) return <Navigate to={APP_ROUTES.dashboard} replace />;
  return <>{children}</>;
}
