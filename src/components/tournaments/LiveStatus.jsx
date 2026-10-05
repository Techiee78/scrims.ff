import { useEffect, useState } from 'react';

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LiveStatus({ tournament }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const status = tournament?.status;
  const matchTime = tournament?.match_time ? new Date(tournament.match_time).getTime() : null;

  if (status === 'completed') {
    return (
      <span className="glass-soft inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Completed
      </span>
    );
  }

  if (!matchTime) {
    return (
      <span className="glass-soft inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {status || 'Upcoming'}
      </span>
    );
  }

  const diff = matchTime - now;

  if (diff > 0) {
    return (
      <span className="glass-soft inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
        Starts in {formatCountdown(diff)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
      </span>
      Live now
    </span>
  );
}