import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AnimatedPage } from '@/animations/presets';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/services/api';
import { authService } from '@/firebase/auth';
import { getInitials } from '@/utils/format';
import { cn } from '@/utils/cn';
import {
  BellIcon,
  GoogleDriveIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  TrashIcon,
  UserIcon,
} from '@/components/ui/Icon';

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters.').max(50),
  photoURL: z.string().trim().url('Enter a valid image URL.').or(z.literal('')),
});

type ProfileInput = z.infer<typeof profileSchema>;

export default function Settings() {
  const { profile, profileLoading, updateProfile, isGoogleUser, signOut } = useAuth();
  const { connected, driveEmail, driveLoading, connecting, connect, disconnect } = useDrive();
  const { theme, setTheme } = useTheme();
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: profile?.displayName ?? '', photoURL: profile?.photoURL ?? '' },
  });

  const saveProfile = async (values: ProfileInput) => {
    setSaving(true);
    try {
      if (values.displayName !== profile?.displayName) {
        await authService.updateDisplayName(values.displayName);
      }
      if (values.photoURL !== (profile?.photoURL ?? '')) {
        await authService.updatePhotoURL(values.photoURL);
      }
      await updateProfile({ displayName: values.displayName, photoURL: values.photoURL || null });
      success('Profile updated');
      reset(values);
    } catch (err) {
      showError('Could not update profile', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConnectDrive = async () => {
    setDriveBusy(true);
    try {
      await connect();
      success('Google Drive connected', 'Uploads will now go to your own Drive.');
    } catch (err) {
      // The connect flow showing the Google consent page is not a failure.
      if (!(err instanceof Error) || !err.message.includes('Redirecting to Google')) {
        showError('Could not connect Google Drive', getErrorMessage(err));
      }
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await disconnect();
    success('Google Drive disconnected', 'Reconnect anytime from Settings.');
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <AnimatedPage className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your profile, permissions, and preferences.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-electric to-grape text-white shadow-glow">
            <UserIcon size={22} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Profile</h2>
            <p className="text-sm text-slate-400">Your public identity on DriveFlow.</p>
          </div>
        </div>

        {profileLoading || !profile ? (
          <p className="py-6 text-sm text-slate-400">Loading profile…</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-4">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt=""
                  className="h-16 w-16 rounded-full border-2 border-electric/40 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-display flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-electric to-grape text-xl font-bold text-white">
                  {getInitials(profile.displayName || profile.email)}
                </span>
              )}
              <div>
                <Badge variant={isGoogleUser ? 'info' : 'neutral'}>
                  {isGoogleUser ? 'Signed in with Google' : 'Email & password account'}
                </Badge>
                <p className="mt-1.5 text-sm text-slate-400">{profile.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(saveProfile)} className="space-y-4" noValidate>
              <Input
                label="Display name"
                placeholder="Your name"
                error={errors.displayName?.message}
                {...register('displayName')}
              />
              <Input
                label="Avatar URL"
                placeholder="https://…/avatar.png"
                hint="Leave empty to use your initials."
                error={errors.photoURL?.message}
                {...register('photoURL')}
              />
              <div className="flex justify-end">
                <Button type="submit" size="lg" loading={saving}>
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-grape to-electric text-white shadow-glow">
            <GoogleDriveIcon size={22} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Google Drive</h2>
            <p className="text-sm text-slate-400">
              Files are uploaded straight to your own Drive — never a shared pool. Connect once and it works from any device.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {driveLoading ? (
            <p className="text-sm text-slate-400">Loading Drive connection…</p>
          ) : connected ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Connected{driveEmail ? ` as ${driveEmail}` : ''}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Uploads go directly into your personal Google Drive from any device where you sign in.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleConnectDrive} loading={connecting || driveBusy}>
                  Reconnect
                </Button>
                <Button variant="danger" size="sm" onClick={handleDisconnectDrive}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Drive not connected</p>
                <p className="mt-1 text-sm text-slate-400">
                  {isGoogleUser
                    ? 'Connect once and Google will ask for permission on its own page. After that, your connection follows your account on every device.'
                    : 'Sign in with the Google account whose Drive you want to use. No Google Drive means no uploads.'}
                </p>
              </div>
              <Button size="sm" onClick={handleConnectDrive} loading={connecting || driveBusy}>
                <GoogleDriveIcon size={15} />
                {isGoogleUser ? 'Connect Google Drive' : 'Link Google Drive'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-midnight to-electric text-white shadow-glow">
            {theme === 'dark' ? <MoonIcon size={22} /> : <SunIcon size={22} />}
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Appearance</h2>
            <p className="text-sm text-slate-400">Choose how DriveFlow looks for you.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: 'dark', label: 'Dark', Icon: MoonIcon },
              { value: 'light', label: 'Light', Icon: SunIcon },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                'flex items-center justify-between rounded-2xl border p-4 text-left transition',
                theme === value
                  ? 'border-electric/50 bg-electric/10'
                  : 'border-white/10 bg-white/5 hover:border-white/25',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon size={20} className={theme === value ? 'text-electric' : 'text-slate-400'} />
                <span className="text-sm font-medium text-white">{label}</span>
              </span>
              {theme === value && <Badge variant="info">Active</Badge>}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-slate-300">
            <BellIcon size={22} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Preferences</h2>
            <p className="text-sm text-slate-400">Notifications and account actions.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-medium text-white">Upload notifications</p>
              <p className="text-xs text-slate-400">Toasts for every completed upload.</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Sign out</p>
              <p className="text-xs text-slate-400">End your session on this device.</p>
            </div>
            <Button variant="danger" size="sm" onClick={handleSignOut}>
              <LogOutIcon size={15} />
              Sign out
            </Button>
          </div>
        </div>
      </Card>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <TrashIcon size={13} />
        Data is stored in Firestore collections: users · uploadHistory · settings.
      </p>
    </AnimatedPage>
  );
}
