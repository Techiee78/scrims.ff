import { useEffect, useState } from 'react';

const IST_TIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

export default function IstClock({ compact = false }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-1" aria-label="Live Indian Standard Time">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="font-display text-[11px] font-semibold tabular-nums tracking-tight text-foreground">
          {IST_TIME.format(now)}
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          IST
        </span>
      </div>
    );
  }

  return (
    <div
      className="glass flex items-center gap-1.5 rounded-full px-3 py-2"
      aria-label="Live Indian Standard Time"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      <span className="font-display text-xs font-semibold tabular-nums tracking-tight text-foreground">
        {IST_TIME.format(now)}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        IST
      </span>
    </div>
  );
}