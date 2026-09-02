import { motion, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useMousePosition } from '@/hooks/useMousePosition';
import { staggerContainer, fadeInUp } from '@/animations/variants';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  FileImageIcon,
  GoogleDriveIcon,
  SparklesIcon,
  UploadCloudIcon,
  ZapIcon,
} from '@/components/ui/Icon';

const STATS = [
  { value: '100%', label: 'Automated' },
  { value: '15 GB', label: 'Free Drive space' },
  { value: '< 5s', label: 'To complete' },
  { value: 'n8n', label: 'Pipelines' },
];

export function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { x, y } = useMousePosition();

  const cardX = useTransform(x, (v) => v * 18);
  const cardY = useTransform(y, (v) => v * 18);
  const badgeX = useTransform(x, (v) => v * -26);
  const badgeY = useTransform(y, (v) => v * -26);

  return (
    <section className="relative overflow-hidden pb-24 pt-32 sm:pt-40 lg:pb-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <motion.div
              variants={staggerContainer(0.12)}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center gap-6 lg:items-start"
            >
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-4 py-1.5 text-sm font-medium text-electric"
              >
                <SparklesIcon size={16} />
                Powered by n8n automation
                <span className="h-1 w-1 rounded-full bg-electric" />
                Google Drive
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[4.2rem]"
              >
                Files flow from your{' '}
                <span className="bg-gradient-to-r from-electric via-electric-100 to-grape bg-clip-text text-transparent">
                  device
                </span>{' '}
                to Google Drive instantly.
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="max-w-xl text-lg leading-relaxed text-slate-400"
              >
                Drag, drop, done. DriveFlow connects your browser to your Google Drive through a
                secure n8n webhook — no extensions, no manual syncing, just seamless uploads.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="xl"
                  glow
                  onClick={() => navigate(user ? APP_ROUTES.dashboard : APP_ROUTES.register)}
                >
                  <UploadCloudIcon size={20} />
                  {user ? 'Go to dashboard' : 'Start uploading — free'}
                  <ArrowRightIcon size={18} />
                </Button>
                <Button size="xl" variant="secondary" onClick={() => navigate(APP_ROUTES.login)}>
                  <GoogleDriveIcon size={20} />
                  Sign in with Google
                </Button>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4 text-sm text-slate-500 lg:justify-start"
              >
                {['No credit card', 'Secure uploads', 'Instant Drive links'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircleIcon size={15} className="text-emerald-400" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Visual */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/20 blur-3xl" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              style={{ perspective: 1200 }}
              className="relative"
            >
              <motion.div
                style={{ x: cardX, y: cardY }}
                className="relative z-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-midnight via-navy-800 to-grape/20 p-6 shadow-card backdrop-blur-xl sm:p-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-grape">
                      <UploadCloudIcon size={20} className="text-white" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold text-white">Upload in progress</p>
                      <p className="text-xs text-slate-400">DriveFlow → Google Drive</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    100%
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'product-launch.mp4', size: '48 MB', Icon: FileImageIcon },
                    { name: 'design-specs.pdf', size: '12 MB', Icon: FileImageIcon },
                    { name: 'portfolio.zip', size: '236 MB', Icon: FileImageIcon },
                  ].map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-950/50 px-4 py-3"
                    >
                      <file.Icon size={18} className="text-electric" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{file.name}</p>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-electric to-grape" />
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{file.size}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-xl border border-electric/20 bg-electric/5 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-electric/20">
                    <CheckCircleIcon size={16} className="text-electric" />
                  </span>
                  <p className="text-sm text-slate-300">
                    Stored to{' '}
                    <span className="font-medium text-white">My Drive</span> —{' '}
                    <span className="font-medium text-electric">link copied</span>
                  </p>
                </div>
              </motion.div>

              <motion.div
                style={{ x: badgeX, y: badgeY }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="absolute -left-6 -top-6 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-navy-800/90 px-4 py-3 shadow-card backdrop-blur-xl sm:flex"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-electric/20 text-electric">
                  <ZapIcon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">n8n automation</p>
                  <p className="text-xs text-slate-400">Webhook → Drive</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="absolute -bottom-6 -right-4 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-navy-800/90 px-4 py-3 shadow-card backdrop-blur-xl sm:flex"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-electric">
                  <GoogleDriveIcon size={18} className="text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Google Drive</p>
                  <p className="text-xs text-slate-400">Stored &amp; shareable</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-20 grid grid-cols-2 gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:grid-cols-4 lg:mt-28"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-bold text-white">
                <span className="bg-gradient-to-r from-electric to-electric-100 bg-clip-text text-transparent">
                  {stat.value}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
