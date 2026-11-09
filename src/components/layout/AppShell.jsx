import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import AppBackground from './AppBackground';
import TopBar from './TopBar';
import GlassNav from './GlassNav';
import FloatingSupport from './FloatingSupport';
import ConnectionBanner from '@/components/states/ConnectionBanner';

export default function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <TopBar user={user} onProfile={() => navigate('/profile')} />
      <main className="mx-auto w-full max-w-md overflow-x-hidden px-4 pb-32 pt-24 md:max-w-2xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ConnectionBanner />
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <GlassNav />
      <FloatingSupport />
    </div>
  );
}