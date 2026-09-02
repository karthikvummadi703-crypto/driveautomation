import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getInitials } from '@/utils/format';
import type { UserProfile } from '@/types/auth';

export interface ProfileCardProps {
  profile: UserProfile | null;
  loading?: boolean;
  driveConnected?: boolean;
  driveEmail?: string | null;
}

export function ProfileCard({ profile, loading = false, driveConnected = false, driveEmail }: ProfileCardProps) {
  if (loading || !profile) {
    return (
      <Card className="flex items-center gap-4 p-5">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </Card>
    );
  }

  const isGoogle = profile.provider === 'google.com';

  return (
    <Card gradient className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-electric/20 blur-3xl" />
      <div className="flex items-center gap-4">
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt={`${profile.displayName}'s avatar`}
            className="h-16 w-16 rounded-full border-2 border-electric/40 object-cover shadow-glow"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-display flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-electric to-grape text-xl font-bold text-white shadow-glow">
            {getInitials(profile.displayName || profile.email)}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-display truncate text-lg font-semibold text-white">
            {profile.displayName || 'DriveFlow User'}
          </h2>
          <p className="truncate text-sm text-slate-400">{profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={isGoogle ? 'info' : 'neutral'}>
              {isGoogle ? 'Google account' : 'Email account'}
            </Badge>
            {driveConnected ? (
              <Badge variant="success">
                Drive connected{driveEmail ? ` · ${driveEmail}` : ''}
              </Badge>
            ) : (
              <Badge variant="warning">Drive not connected</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

