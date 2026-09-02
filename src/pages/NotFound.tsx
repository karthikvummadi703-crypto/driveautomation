import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AnimatedPage } from '@/animations/presets';
import { Button } from '@/components/ui/Button';
import { APP_ROUTES } from '@/config/constants';
import { ArrowLeftIcon } from '@/components/ui/Icon';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <AnimatedPage className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <motion.p
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="font-display bg-gradient-to-r from-electric via-electric-100 to-grape bg-clip-text text-[7rem] font-bold leading-none text-transparent sm:text-[10rem]"
      >
        404
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-display mt-4 text-2xl font-bold text-white sm:text-3xl"
      >
        This file got lost in the cloud
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-3 max-w-md text-slate-400"
      >
        The page you’re looking for doesn’t exist or has been moved. Let’s get you back on track.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-8 flex gap-3"
      >
        <Button variant="primary" size="lg" onClick={() => navigate(-1)}>
          <ArrowLeftIcon size={17} />
          Go back
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate(APP_ROUTES.home)}>
          Home
        </Button>
      </motion.div>
    </AnimatedPage>
  );
}
