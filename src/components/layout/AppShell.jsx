import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AppBackground from './AppBackground';
import TopBar from './TopBar';
import GlassNav from './GlassNav';
import ProfileSheet from '@/components/profile/ProfileSheet';

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <TopBar user={user} onProfile={() => setProfileOpen(true)} />
      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-24 md:max-w-2xl">
        <Outlet />
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