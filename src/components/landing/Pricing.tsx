import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { staggerContainer, fadeInUp } from '@/animations/variants';
import { Button } from '@/components/ui/Button';
import { APP_ROUTES } from '@/config/constants';
import { cn } from '@/utils/cn';
import { CheckIcon, ZapIcon, UsersIcon, GlobeIcon } from '@/components/ui/Icon';
import { SectionHeading } from './SectionHeading';

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  Icon: typeof ZapIcon;
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to try DriveFlow.',
    features: [
      '5 uploads per day',
      'Up to 100 MB per file',
      'Full upload history',
      'Google & email sign-in',
    ],
    cta: 'Start for free',
    Icon: ZapIcon,
  },
  {
    name: 'Pro',
    price: '$9',
    period: 'per month',
    description: 'For creators and small teams shipping daily.',
    features: [
      'Unlimited uploads',
      'Up to 2 GB per file',
      'Advanced filters & search',
      'Storage analytics',
      'Priority webhook queue',
    ],
    cta: 'Get Pro',
    featured: true,
    Icon: UsersIcon,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'tailored',
    description: 'For organizations with automation needs.',
    features: [
      'Dedicated n8n pipeline',
      'SLA-backed uptime',
      'SSO & team workspaces',
      'Custom Drive folders',
    ],
    cta: 'Contact sales',
    Icon: GlobeIcon,
  },
];

export function Pricing() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Simple pricing,{' '}
              <span className="bg-gradient-to-r from-electric to-grape bg-clip-text text-transparent">
                zero friction
              </span>
            </>
          }
          description="Start free. Upgrade when your uploads start scaling."
        />

        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 lg:grid-cols-3"
        >
          {PLANS.map(({ name, price, period, description, features, cta, featured, Icon }) => (
            <motion.div
              key={name}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className={cn(
                'relative flex flex-col rounded-2xl border p-8 shadow-card',
                featured
                  ? 'border-electric/40 bg-gradient-to-br from-midnight via-navy-800 to-grape/25 shadow-glow lg:-translate-y-3'
                  : 'border-white/10 bg-white/5 backdrop-blur-xl',
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-electric to-grape px-4 py-1 text-xs font-semibold text-white shadow-glow">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl text-white',
                    featured
                      ? 'bg-gradient-to-br from-electric to-grape shadow-glow'
                      : 'bg-white/10',
                  )}
                >
                  <Icon size={18} />
                </span>
                <h3 className="font-display text-lg font-semibold text-white">{name}</h3>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-5xl font-bold text-white">{price}</span>
                <span className="pb-1.5 text-sm text-slate-400">{period}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-electric" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={featured ? 'primary' : 'secondary'}
                size="lg"
                fullWidth
                className="mt-8"
                onClick={() => navigate(APP_ROUTES.register)}
              >
                {cta}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
