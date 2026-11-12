import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownToLine, ClipboardList, IndianRupee, LayoutDashboard, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/admin/results', label: 'Results', icon: ClipboardList },
  { to: '/admin/requests', label: 'Requests', icon: IndianRupee },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user?.role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
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
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Trophy className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold leading-none">Scrims.ff Admin</p>
              <p className="text-[10px] text-muted-foreground">Tournament control</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="rounded-full text-xs"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to app
          </Button>
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