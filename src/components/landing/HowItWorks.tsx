import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { staggerContainer, fadeInUp } from '@/animations/variants';
import { SectionHeading } from './SectionHeading';
import {
  FolderIcon,
  GoogleDriveIcon,
  LogInIcon,
  UploadCloudIcon,
  ZapIcon,
  type IconProps,
} from '@/components/ui/Icon';

interface Step {
  Icon: ComponentType<IconProps>;
  title: string;
  description: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    Icon: LogInIcon,
    title: 'Sign in',
    description: 'Authenticate with Google or email via Firebase Authentication.',
    accent: 'from-electric to-grape',
  },
  {
    Icon: UploadCloudIcon,
    title: 'Drop your file',
    description: 'Drag & drop or browse. DriveFlow validates size and type instantly.',
    accent: 'from-grape to-grape-100',
  },
  {
    Icon: ZapIcon,
    title: 'Webhook fires',
    description: 'A POST request hits the n8n webhook with your file, userId and email.',
    accent: 'from-electric-100 to-grape',
  },
  {
    Icon: GoogleDriveIcon,
    title: 'Saved to Drive',
    description: 'n8n uploads to Google Drive and returns a shareable link + metadata.',
    accent: 'from-emerald-400 to-electric',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From device to Drive in{' '}
              <span className="bg-gradient-to-r from-electric to-grape bg-clip-text text-transparent">
                four steps
              </span>
            </>
          }
          description="A purpose-built automation removes every manual step between you and your files."
        />

        <div className="relative">
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-electric/30 to-transparent lg:block" />
          <motion.ol
            variants={staggerContainer(0.15)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
          >
            {STEPS.map(({ Icon, title, description, accent }, index) => (
              <motion.li key={title} variants={fadeInUp} className="relative text-center lg:text-left">
                <div className="flex justify-center lg:justify-start">
                  <div className="relative">
                    <span
                      className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-glow`}
                    >
                      <Icon size={34} />
                    </span>
                    <span className="font-display absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-navy-900 text-sm font-bold text-white shadow-card">
                      {index + 1}
                    </span>
                  </div>
                </div>
                <h3 className="font-display mt-6 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl sm:flex-row sm:text-left"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-electric/10 text-electric">
            <FolderIcon size={22} />
          </span>
          <p className="max-w-xl text-sm text-slate-300">
            Every upload is stored in <span className="font-medium text-white">Cloud Firestore</span>{' '}
            — filename, size, timestamp, and Drive link — so your history and stats are always in
            sync.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
