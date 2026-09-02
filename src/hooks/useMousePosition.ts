import { useEffect } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

export function useMousePosition(smoothing = 60) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: smoothing });
  const springY = useSpring(y, { stiffness: 120, damping: smoothing });

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const rect = document.body.getBoundingClientRect();
      x.set((event.clientX - rect.left) / rect.width - 0.5);
      y.set((event.clientY - rect.top) / rect.height - 0.5);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [x, y]);

  return { x: springX, y: springY };
}
