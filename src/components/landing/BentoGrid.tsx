import { motion } from 'framer-motion';
import type { ComponentType, ReactNode } from 'react';
import { staggerContainer, fadeInUp } from '@/animations/variants';
import { SectionHeading } from './SectionHeading';
import { cn } from '@/utils/cn';
import {
  CheckCircleIcon,
  GlobeIcon,
  GoogleDriveIcon,
  HardDriveIcon,
  LayersIcon,
  ShieldIcon,
  UploadCloudIcon,
  ZapIcon,
  type IconProps,
} from '@/components/ui/Icon';

interface BentoCell {
  Icon?: ComponentType<IconProps>;
  title: string;
  description: string;
  gradient: string;
  className?: string;
  visual?: ReactNode;
}

const visualBars = (
  <div className="mt-4 space-y-2.5">
    {[
      { label: 'Photos', value: 82 },
      { label: 'Documents', value: 64 },
      { label: 'Videos', value: 45 },
      { label: 'Archives', value: 28 },
    ].map((row) => (
      <div key={row.label} className="flex items-center gap-3">
        <span className="w-24 text-xs text-slate-400">{row.label}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${row.value}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-electric to-grape"
          />
        </div>
        <span className="text-xs font-medium text-white">{row.value}%</span>
      </div>
    ))}
  </div>
);

const visualFlow = (
  <div className="mt-4 flex items-center gap-2">
    {[
      { Icon: UploadCloudIcon, label: 'Device', color: 'text-electric bg-electric/10 border-electric/30' },
      { Icon: ZapIcon, label: 'n8n', color: 'text-grape-100 bg-grape/20 border-grape-100/30' },
      { Icon: GoogleDriveIcon, label: 'Drive', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' },
    ].map((step, index, arr) => (
      <div key={step.label} className="flex flex-1 flex-col items-center gap-2">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', step.color)}>
          <step.Icon size={20} />
        </span>
        <span className="text-xs text-slate-400">{step.label}</span>
        {index < arr.length - 1 && <ChevronArrow />}
      </div>
    ))}
  </div>
);

function ChevronArrow() {
  return <span className="text-slate-600">→</span>;
}

const CELLS: BentoCell[] = [
  {
    Icon: HardDriveIcon,
    title: 'Storage at a glance',
    description: 'Live quota meter with per-type breakdowns.',
    gradient: 'from-electric to-grape',
    className: 'sm:col-span-2 lg:row-span-2',
    visual: visualBars,
  },
  {
    Icon: ShieldIcon,
    title: 'Permission first',
    description: 'Email users approve uploads once, stored safely in Firestore.',
    gradient: 'from-grape to-grape-100',
  },
  {
    Icon: LayersIcon,
    title: 'Clean architecture',
    description: 'Reusable components, typed services, and env-driven config.',
    gradient: 'from-electric-100 to-grape',
  },
  {
    Icon: GlobeIcon,
    title: 'Deploy anywhere',
    description: 'Containerized for Google Cloud Run — scales to zero when idle.',
    gradient: 'from-grape-100 to-electric',
  },
  {
    Icon: UploadCloudIcon,
    title: 'n8n → Drive pipeline',
    description: 'One webhook call moves your file from device to Drive.',
    gradient: 'from-electric to-emerald-400',
    className: 'sm:col-span-2',
    visual: visualFlow,
  },
];

export function BentoGrid() {
  return (
    <section id="bento" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why DriveFlow"
          title={
            <>
              A <span className="bg-gradient-to-r from-electric to-grape bg-clip-text text-transparent">bento grid</span>{' '}
              of reasons to switch
            </>
          }
          description="One beautiful, cohesive dashboard backed by a scalable cloud pipeline."
        />

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CELLS.map(({ Icon, title, description, gradient, className, visual }) => (
            <motion.div
              key={title}
              variants={fadeInUp}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-midnight via-navy-800 to-grape/10 p-7 shadow-card',
                className,
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30',
                  gradient,
                )}
              />
              {Icon && (
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-glow`}
                >
                  <Icon size={22} />
                </span>
              )}
              <h3 className="font-display mt-5 text-xl font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
              {visual}
              {title === 'Storage at a glance' && (
                <div className="mt-6 flex items-end gap-2">
                  <CheckCircleIcon size={16} className="text-emerald-400" />
                  <span className="text-xs text-slate-400">Synced with Firestore in real time</span>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
