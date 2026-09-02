import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRightIcon, UploadCloudIcon } from '@/components/ui/Icon';

export function CTA() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-white/10 p-10 text-center shadow-card sm:p-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-electric/20 via-grape/20 to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-blob rounded-full bg-electric/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 animate-blob rounded-full bg-grape/40 blur-3xl [animation-delay:3s]" />

          <div className="relative">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-electric to-grape text-white shadow-glow">
              <UploadCloudIcon size={30} />
            </span>
            <h2 className="font-display mt-8 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Ready to make your files{' '}
              <span className="bg-gradient-to-r from-electric via-electric-100 to-grape bg-clip-text text-transparent">
                flow?
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              Join DriveFlow and start uploading straight to Google Drive in under a minute. Free
              forever for your first files.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="xl"
                glow
                onClick={() => navigate(user ? APP_ROUTES.dashboard : APP_ROUTES.register)}
              >
                {user ? 'Open your dashboard' : 'Create free account'}
                <ArrowRightIcon size={18} />
              </Button>
              <Button size="xl" variant="outline" onClick={() => navigate(APP_ROUTES.login)}>
                Sign in
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
