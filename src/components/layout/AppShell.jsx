import { useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import AppBackground from './AppBackground';
import TopBar from './TopBar';
import GlassNav from './GlassNav';
import ProfileSheet from '@/components/profile/ProfileSheet';

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const outlet = useOutlet();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <TopBar user={user} onProfile={() => setProfileOpen(true)} />
      <main className="mx-auto w-full max-w-md overflow-x-hidden px-4 pb-32 pt-24 md:max-w-2xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <GlassNav />
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
        onSaved={setUser}
      />
    </div>
  );
}