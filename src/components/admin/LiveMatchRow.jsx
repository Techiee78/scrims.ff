import { MapPin, Trophy, Users } from 'lucide-react';
import { coins, matchTime } from '@/lib/format';
import SlotBar from '@/components/tournaments/SlotBar';

export default function LiveMatchRow({ tournament }) {
  const joined = tournament.joined || 0;
  const total = tournament.total_slots || 0;

  return (
    <div className="glass-soft rounded-2xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">{tournament.title}</p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-destructive">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
          </span>
          Live
        </span>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>
          {tournament.mode} · {tournament.team_type || 'Solo'}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {tournament.map || 'TBA'}
        </span>
      </p>

      <p className="mt-1.5 text-[11px] text-accent">{matchTime(tournament.match_time)}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 font-semibold">
          <Users className="h-3.5 w-3.5 text-primary" />
          {joined}/{total} slots
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          <Trophy className="h-3.5 w-3.5" />
          {coins(tournament.prize_pool)} prize
        </span>
      </div>

      {total > 0 && (
        <div className="mt-2">
          <SlotBar filled={joined} total={total} />
        </div>
      )}
    </div>
  );
}