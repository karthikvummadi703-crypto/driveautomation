import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/animations/variants';
import { SectionHeading } from './SectionHeading';
import { getInitials } from '@/utils/format';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  gradient: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Aarav Mehta',
    role: 'Product Designer',
    quote:
      'DriveFlow replaced a tangle of sync apps on my machine. I drag a mockup in and the Drive link is already on my clipboard.',
    gradient: 'from-electric to-grape',
  },
  {
    name: 'Sofia Rodriguez',
    role: 'Marketing Lead',
    quote:
      'The permission flow feels so professional. My team uploads assets daily and everything lands neatly in our shared Drive.',
    gradient: 'from-grape to-grape-100',
  },
  {
    name: 'Daniel Kim',
    role: 'Indie Developer',
    quote:
      'Setting up was minutes — Firebase auth, one webhook, done. The history and storage stats are a genuinely nice touch.',
    gradient: 'from-electric-100 to-grape',
  },
];

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Testimonials"
          title={
            <>
              Loved by{' '}
              <span className="bg-gradient-to-r from-electric to-grape bg-clip-text text-transparent">
                teams that move fast
              </span>
            </>
          }
          description="Here’s what builders say about their DriveFlow experience."
        />

        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 md:grid-cols-3"
        >
          {TESTIMONIALS.map(({ name, role, quote, gradient }) => (
            <motion.figure
              key={name}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-8 shadow-card backdrop-blur-xl"
            >
              <blockquote>
                <div className="mb-4 flex gap-1 text-electric" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-base leading-relaxed text-slate-300">“{quote}”</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-display text-sm font-bold text-white shadow-glow`}
                >
                  {getInitials(name)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="text-xs text-slate-400">{role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
