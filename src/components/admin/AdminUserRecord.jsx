import { Crosshair, Swords, Trophy } from 'lucide-react';
import StatTile from '@/components/tournaments/StatTile';

// Same record summary the player sees on their own profile.
export default function AdminUserRecord({ registrations }) {
  const played = registrations.filter((row) => row.played);
  const matches = played.length;
  const wins = played.filter((row) => Number(row.placement) === 1).length;
  const kills = played.reduce((sum, row) => sum + Number(row.kills || 0), 0);

  return (
    <div>
      <p className="text-xs font-semibold tracking-tight text-muted-foreground">Record</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <StatTile icon={Trophy} label="Wins" value={wins} />
        <StatTile icon={Crosshair} label="Kills" value={kills} />
        <StatTile icon={Swords} label="Matches" value={matches} />
      </div>
      {matches === 0 && (
        <p className="glass-soft mt-2 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground">
          No results yet.
        </p>
      )}
      {matches > 0 && (
        <div className="mt-2 space-y-2">
          {played.slice(0, 3).map((row) => (
            <div key={row.id} className="glass-soft flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.tournament_title}</p>
                <p className="text-xs text-muted-foreground">{row.mode}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold">
                {Number(row.placement) === 1 ? 'Win' : row.placement ? `#${row.placement}` : 'Played'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}