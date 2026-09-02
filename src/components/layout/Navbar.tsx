import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';
import { ArrowRightIcon, LogOutIcon, MenuIcon, MoonIcon, SunIcon, UserIcon, XIcon } from '@/components/ui/Icon';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleNavClick = (href: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    setOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(APP_ROUTES.home);
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-300',
          scrolled
            ? 'border-b border-white/10 bg-navy-950/80 backdrop-blur-xl'
            : 'bg-transparent',
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
          <Logo size="md" />

          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleNavClick(link.href)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>

            <div className="hidden items-center gap-2 sm:flex">
              {user ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate(APP_ROUTES.dashboard)}>
                    <UserIcon size={16} />
                    Dashboard
                  </Button>
                  <button
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <LogOutIcon size={18} />
                  </button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate(APP_ROUTES.login)}>
                    Sign in
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => navigate(APP_ROUTES.register)}>
                    Get started
                    <ArrowRightIcon size={16} />
                  </Button>
                </>
              )}
            </div>

            <button
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 lg:hidden"
          >
            <div className="absolute inset-0 bg-navy-950/95 backdrop-blur-xl" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-full flex-col justify-center px-8"
            >
              <nav className="flex flex-col gap-2" aria-label="Mobile">
                {NAV_LINKS.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={handleNavClick(link.href)}
                    className="font-display py-3 text-2xl font-semibold text-white"
                  >
                    {link.label}
                  </motion.a>
                ))}
              </nav>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-8 flex flex-col gap-3"
              >
                {user ? (
                  <Button variant="primary" size="lg" fullWidth onClick={() => { setOpen(false); navigate(APP_ROUTES.dashboard); }}>
                    <UserIcon size={18} />
                    Go to dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" size="lg" fullWidth onClick={() => { setOpen(false); navigate(APP_ROUTES.login); }}>
                      Sign in
                    </Button>
                    <Button variant="primary" size="lg" fullWidth onClick={() => { setOpen(false); navigate(APP_ROUTES.register); }}>
                      Get started
                      <ArrowRightIcon size={18} />
                    </Button>
                  </>
                )}
              </motion.div>
              {user && (
                <p className="mt-6 text-center text-sm text-slate-400">
                  Signed in as <span className="font-medium text-slate-200">{profile?.email ?? user.email}</span>
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
