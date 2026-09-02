import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { useTheme } from '@/hooks/useTheme';
import { formatGB, getInitials } from '@/utils/format';
import { cn } from '@/utils/cn';
import {
  BotIcon,
  ClockIcon,
  HardDriveIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UploadCloudIcon,
  XIcon,
} from '@/components/ui/Icon';

const NAV_ITEMS = [
  { to: APP_ROUTES.dashboard, label: 'Dashboard', Icon: HardDriveIcon },
  { to: APP_ROUTES.chat, label: 'AI Chat', Icon: BotIcon },
  { to: APP_ROUTES.upload, label: 'Upload', Icon: UploadCloudIcon },
  { to: APP_ROUTES.history, label: 'History', Icon: ClockIcon },
  { to: APP_ROUTES.settings, label: 'Settings', Icon: SettingsIcon },
];

function SidebarContent() {
  const { user, profile, signOut } = useAuth();
  const {
    storageUsedBytes,
    storageQuotaBytes,
    storagePercentage,
    connected,
  } = useDrive();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-5">
        <Logo size="md" />
      </div>

      <nav className="flex-1 space-y-1.5 px-3" aria-label="Dashboard">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-electric/20 to-grape/20 text-white shadow-glow'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={cn('transition', isActive ? 'text-electric' : 'text-slate-500 group-hover:text-electric')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <HardDriveIcon size={14} className="text-electric" />
            Storage
          </span>
          <span className="text-xs font-semibold text-white">
            {connected ? `${storagePercentage}%` : '0%'}
          </span>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-electric to-grape transition-[width] duration-500"
            style={{ width: `${connected ? storagePercentage : 0}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {connected
            ? `${formatGB(storageUsedBytes)} of ${storageQuotaBytes !== null ? formatGB(storageQuotaBytes) : 'Unlimited'}`
            : 'Drive not connected'}
        </p>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt=""
              className="h-9 w-9 rounded-full border border-white/20 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-electric to-grape text-xs font-bold text-white">
              {getInitials(profile?.displayName || profile?.email || 'U')}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{profile?.displayName || 'User'}</p>
            <p className="truncate text-xs text-slate-500">{profile?.email ?? user?.email}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate(APP_ROUTES.home);
            }}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-400/10 hover:text-rose-400"
          >
            <LogOutIcon size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 bg-navy-900/70 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-navy-900"
          >
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <XIcon size={18} />
            </button>
            <SidebarContent />
          </motion.aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-navy-950/70 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 lg:hidden"
            >
              <MenuIcon size={18} />
            </button>
            <Logo size="sm" showText={false} />
            <span className="hidden text-sm font-medium text-slate-400 sm:block">DriveFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
            <Button variant="primary" size="sm" onClick={() => navigate(APP_ROUTES.upload)}>
              <UploadCloudIcon size={16} />
              Upload
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <Outlet />
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
