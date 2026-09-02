import { animate, motion, useInView, useMotionValue, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { staggerContainer, fadeInUp } from '@/animations/variants';
import { SectionHeading } from './SectionHeading';

interface Stat {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}

const STATS: Stat[] = [
  { value: 128000, suffix: '+', label: 'Files uploaded' },
  { value: 4.2, suffix: 's', label: 'Average upload time', decimals: 1 },
  { value: 99.9, suffix: '%', label: 'Success rate', decimals: 1 },
  { value: 24, suffix: '/7', label: 'Automation uptime' },
];

function CountUp({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest: number) => {
        if (ref.current) {
          ref.current.textContent = `${latest.toFixed(decimals)}${suffix}`;
        }
      },
    });
    return () => controls.stop();
  }, [inView, value, suffix, decimals, reduceMotion, motionValue]);

  return (
    <span ref={ref} className="bg-gradient-to-r from-electric to-electric-100 bg-clip-text text-transparent">
      0{suffix}
    </span>
  );
}

export function Statistics() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Proven at scale"
          title={
            <>
              Numbers that{' '}
              <span className="bg-gradient-to-r from-electric to-grape bg-clip-text text-transparent">
                speak volumes
              </span>
            </>
          }
          description="DriveFlow keeps your uploads moving no matter how many files land in your queue."
        />

        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-midnight via-navy-800 to-grape/15 p-8 text-center shadow-card"
            >
              <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-electric/20 blur-2xl" />
              <p className="font-display text-4xl font-bold">
                <CountUp value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </p>
              <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
