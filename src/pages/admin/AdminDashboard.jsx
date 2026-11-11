import { useEffect, useState } from 'react';
import { CalendarClock, Coins, RefreshCw, Radio, Swords, Trophy, Users } from 'lucide-react';
import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';
import { coins } from '@/lib/format';
import LiveMatchRow from '@/components/admin/LiveMatchRow';

const REFRESH_MS = 15000;

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="glass-soft flex items-center gap-3 rounded-2xl px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold leading-none">{value}</p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await callFunction('getAdminStats', await withAuth({}));
        if (!active) return;
        setStats(res?.data ?? res);
        setFailed(false);
      } catch (_e) {
        if (active) setFailed(true);
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (!stats) {
    return (
      <p className="text-xs text-muted-foreground">
        {failed ? 'Could not load dashboard. Retrying…' : 'Loading dashboard…'}
      </p>
    );
  }

  const liveMatches = stats.liveMatches || [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-semibold">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">Overview of your tournament activity.</p>
        </div>
        <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <RefreshCw className="h-3 w-3 text-primary" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatCard icon={Trophy} value={stats.tournaments} label="Tournaments" />
        <StatCard icon={Radio} value={stats.live} label="Live now" />
        <StatCard icon={CalendarClock} value={stats.upcoming} label="Upcoming" />
        <StatCard icon={Swords} value={stats.registrations} label="Total entries" />
        <StatCard icon={Users} value={stats.players} label="Unique players" />
        <StatCard icon={Coins} value={coins(stats.prizePool)} label="Prize pool" />
      </div>

      <div className="glass-soft rounded-2xl px-4 py-2.5 text-[11px] text-muted-foreground">
        Players hold <span className="font-semibold text-foreground">{coins(stats.coins)} coins</span> across all wallets.
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Live matches
          </p>
          <p className="text-[10px] text-muted-foreground">Auto-updates every 15s</p>
        </div>
        {liveMatches.length === 0 ? (
          <p className="glass-soft rounded-2xl px-4 py-5 text-center text-xs text-muted-foreground">
            No matches are live right now.
          </p>
        ) : (
          <div className="space-y-2">
            {liveMatches.map((t) => (
              <LiveMatchRow key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}