import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ClipboardList, IndianRupee, LayoutDashboard, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import ScreenHeader from '@/components/layout/ScreenHeader';
import { cn } from '@/lib/utils';

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/admin/results', label: 'Results', icon: ClipboardList },
  { to: '/admin/requests', label: 'Deposit Requests', icon: IndianRupee },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user?.role) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-display text-lg font-semibold">Admins only</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          You don't have access to the admin panel.
        </p>
        <Button onClick={() => navigate('/')} className="rounded-full">
          Back to app
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-16" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4rem)' }}>
      <header
        className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-3">
          <ScreenHeader
            icon={Trophy}
            title="Scrims.ff Admin"
            subtitle="Tournament control"
          />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 no-scrollbar">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-soft text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}