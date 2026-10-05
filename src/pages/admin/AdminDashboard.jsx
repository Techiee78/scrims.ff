import { useEffect, useState } from 'react';
import { CalendarClock, Coins, Radio, Swords, Trophy, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { coins } from '@/lib/format';

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

  useEffect(() => {
    base44.functions
      .invoke('getAdminStats', {})
      .then((res) => setStats(res?.data ?? res))
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <p className="text-xs text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-lg font-semibold">Dashboard</h1>
        <p className="text-[11px] text-muted-foreground">Overview of your tournament activity.</p>
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
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Live matches
        </p>
        {stats.liveMatches.length === 0 ? (
          <p className="glass-soft rounded-2xl px-4 py-5 text-center text-xs text-muted-foreground">
            No matches are live right now.
          </p>
        ) : (
          <div className="space-y-2">
            {stats.liveMatches.map((t) => (
              <div key={t.id} className="glass-soft flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {t.mode} · {t.team_type || 'Solo'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">
                  {t.filled_slots || 0}/{t.total_slots || 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}