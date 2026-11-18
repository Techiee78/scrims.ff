import { getTimeStatus } from '@/lib/tournamentTime';

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

const pill =
  'glass-soft inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight';

export default function LiveStatus({ tournament, now = Date.now() }) {
  const status = getTimeStatus(tournament, now);
  const matchTime = tournament?.match_time ? new Date(tournament.match_time).getTime() : null;

  if (status === 'completed') {
    return <span className={`${pill} text-muted-foreground`}>Completed</span>;
  }

  if (!matchTime) {
    return <span className={`${pill} text-muted-foreground`}>{tournament?.status || 'Upcoming'}</span>;
  }

  if (status === 'upcoming') {
    const diff = matchTime - now;
    return <span className={`${pill} text-accent`}>Starts in {formatCountdown(diff)}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold tracking-tight text-destructive">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
      </span>
      Live now
    </span>
  );
}