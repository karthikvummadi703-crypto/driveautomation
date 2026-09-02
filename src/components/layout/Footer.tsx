import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { APP_ROUTES } from '@/config/constants';
import { GitHubIcon, InstagramIcon, LinkedInIcon, TwitterIcon } from '@/components/ui/Icon';

const PRODUCT_LINKS = [
  { label: 'Dashboard', href: APP_ROUTES.dashboard },
  { label: 'Upload', href: APP_ROUTES.upload },
  { label: 'History', href: APP_ROUTES.history },
  { label: 'Settings', href: APP_ROUTES.settings },
];

const COMPANY_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com', Icon: GitHubIcon },
  { label: 'Twitter', href: 'https://twitter.com', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: LinkedInIcon },
  { label: 'Instagram', href: 'https://instagram.com', Icon: InstagramIcon },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-navy-950/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              The premium way to move files from your device straight into Google Drive through an
              automated n8n pipeline. Fast, secure, and effortless.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 transition hover:border-electric/40 hover:text-electric"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Product</h3>
            <ul className="mt-4 space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-400 transition hover:text-electric"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Explore</h3>
            <ul className="mt-4 space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-sm text-slate-400 transition hover:text-electric"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Security</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>Firebase Authentication</li>
              <li>Cloud Firestore storage</li>
              <li>Google Drive API via n8n</li>
              <li>Encrypted in transit</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} DriveFlow. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-slate-500 transition hover:text-slate-300">Privacy</a>
            <a href="#" className="text-sm text-slate-500 transition hover:text-slate-300">Terms</a>
            <a href="#" className="text-sm text-slate-500 transition hover:text-slate-300">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
