import { AnimatedPage } from '@/animations/presets';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { BentoGrid } from '@/components/landing/BentoGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Statistics } from '@/components/landing/Statistics';
import { Pricing } from '@/components/landing/Pricing';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';

export default function LandingPage() {
  return (
    <AnimatedPage className="min-h-screen">
      <Hero />
      <Features />
      <BentoGrid />
      <HowItWorks />
      <Statistics />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTA />
    </AnimatedPage>
  );
}

