import { useEffect, useState } from 'react';
import { Crosshair, Swords, Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatTile from '@/components/tournaments/StatTile';

export default function PlayerStats({ user }) {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    base44.functions
      .invoke('getMyRegistrations', {})
      .then((res) => {
        setResults(((res?.data ?? res)?.registrations ?? []).filter((row) => row.played));
        setLoading(false);
      });
  }, [user?.email]);

  const matches = results.length;
  const wins = results.filter((row) => Number(row.placement) === 1).length;
  const kills = results.reduce((sum, row) => sum + Number(row.kills || 0), 0);

  return (
    <div className="mt-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Your record
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {loading ? (
          [0, 1, 2].map((key) => (
            <div key={key} className="glass-soft h-[66px] animate-pulse rounded-2xl" />
          ))
        ) : (
          <>
            <StatTile icon={Trophy} label="Wins" value={wins} />
            <StatTile icon={Crosshair} label="Kills" value={kills} />
            <StatTile icon={Swords} label="Matches" value={matches} />
          </>
        )}
      </div>

      {!loading && matches === 0 && (
        <p className="glass-soft mt-2 rounded-2xl px-3 py-2.5 text-[11px] text-muted-foreground">
          No results yet — your wins and kills show up here after your first match.
        </p>
      )}

      {!loading && matches > 0 && (
        <div className="mt-2 space-y-2">
          {results.slice(0, 3).map((row) => {
            const won = Number(row.placement) === 1;
            return (
              <div
                key={row.id}
                className="glass-soft flex items-center justify-between gap-3 rounded-2xl px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{row.tournament_title}</p>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {row.mode}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    <Crosshair className="h-3.5 w-3.5 text-primary" />
                    {Number(row.kills || 0)}
                  </span>
                  <span
                    className={
                      won
                        ? 'rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary'
                        : 'rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground'
                    }
                  >
                    {won ? 'Win' : row.placement ? `#${row.placement}` : 'Played'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}