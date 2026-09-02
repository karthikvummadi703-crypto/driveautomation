import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { staggerContainer, fadeInUp } from '@/animations/variants';
import { SectionHeading } from './SectionHeading';
import {
  ClockIcon,
  HardDriveIcon,
  LinkIcon,
  SearchIcon,
  ShieldIcon,
  ZapIcon,
  type IconProps,
} from '@/components/ui/Icon';

interface Feature {
  Icon: ComponentType<IconProps>;
  title: string;
  description: string;
  gradient: string;
}

const FEATURES: Feature[] = [
  {
    Icon: ZapIcon,
    title: 'Instant webhook uploads',
    description:
      'Files travel straight from your browser to Google Drive via a blazing-fast n8n webhook. No middleman, no waiting room.',
    gradient: 'from-electric to-electric-100',
  },
  {
    Icon: ShieldIcon,
    title: 'Firebase-grade security',
    description:
      'Sign in with Google or email through Firebase Authentication. Email users grant explicit permission before the first upload.',
    gradient: 'from-grape to-grape-100',
  },
  {
    Icon: ClockIcon,
    title: 'Full upload history',
    description:
      'Every transfer is recorded in Cloud Firestore — filename, size, timestamp, and Drive link. Searchable and filterable forever.',
    gradient: 'from-emerald-400 to-electric',
  },
  {
    Icon: LinkIcon,
    title: 'Shareable Drive links',
    description:
      'The webhook returns a public Drive link for every upload. Copy it, share it, embed it — your files stay yours.',
    gradient: 'from-electric-100 to-grape',
  },
  {
    Icon: HardDriveIcon,
    title: 'Storage insights',
    description:
      'Track storage used against your Drive quota with a live progress bar and per-upload statistics on the dashboard.',
    gradient: 'from-grape-100 to-electric',
  },
  {
    Icon: SearchIcon,
    title: 'Smart search & filters',
    description:
      'Find any file in seconds. Search by name or type and filter by status, extension, and upload date across your history.',
    gradient: 'from-electric to-emerald-400',
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Features"
          title={
            <>
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-electric to-grape bg-clip-text text-transparent">
                ship files fast
              </span>
            </>
          }
          description="A complete upload experience — from the landing page to the final Drive link."
        />

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map(({ Icon, title, description, gradient }) => (
            <motion.div
              key={title}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-7 shadow-card backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-electric/20 to-grape/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-glow transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
              >
                <Icon size={22} />
              </span>
              <h3 className="font-display mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
