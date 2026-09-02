import { motion, useTransform } from 'framer-motion';
import { useMousePosition } from '@/hooks/useMousePosition';

export function Background() {
  const { x, y } = useMousePosition();

  const blob1X = useTransform(x, (v) => v * -60);
  const blob1Y = useTransform(y, (v) => v * -60);
  const blob2X = useTransform(x, (v) => v * 80);
  const blob2Y = useTransform(y, (v) => v * 80);
  const blob3X = useTransform(x, (v) => v * -40);
  const blob3Y = useTransform(y, (v) => v * -40);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-navy-950">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-950 to-navy-900" />

      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="absolute -left-40 -top-40 h-[34rem] w-[34rem] animate-blob rounded-full bg-grape/25 blur-3xl"
        aria-hidden="true"
      />
      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        className="absolute -right-48 top-1/3 h-[32rem] w-[32rem] animate-blob rounded-full bg-electric/20 blur-3xl [animation-delay:2s]"
        aria-hidden="true"
      />
      <motion.div
        style={{ x: blob3X, y: blob3Y }}
        className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] animate-blob rounded-full bg-midnight-600/40 blur-3xl [animation-delay:4s]"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(76,201,240,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(76,201,240,0.08) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric/40 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
