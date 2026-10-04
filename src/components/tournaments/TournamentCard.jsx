import { Check, Clock, Coins, MapPin, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SlotBar from './SlotBar';
import StatTile from './StatTile';
import { coins, matchTime } from '@/lib/format';

export default function TournamentCard({ tournament, joined, onJoin }) {
  const full = (tournament.filled_slots || 0) >= (tournament.total_slots || 0);

  return (
    <article className="glass rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="glass-soft inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {tournament.mode}
          </span>
          <h3 className="mt-2 truncate font-display text-base font-semibold">{tournament.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {tournament.map || 'TBA'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {matchTime(tournament.match_time)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Prize</p>
          <p className="font-display text-lg font-semibold text-primary">{coins(tournament.prize_pool)}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile icon={Coins} label="Entry" value={tournament.entry_fee ? coins(tournament.entry_fee) : 'Free'} />
        <StatTile icon={Zap} label="Per kill" value={coins(tournament.per_kill)} />
        <StatTile icon={Trophy} label="Winner" value={coins(tournament.prize_pool)} />
      </div>

      <div className="mt-3.5">
        <SlotBar filled={tournament.filled_slots || 0} total={tournament.total_slots || 0} />
      </div>

      {joined ? (
        <div className="glass-soft mt-3.5 flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Check className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium">Slot booked — room details are in My Matches</span>
        </div>
      ) : (
        <Button
          onClick={onJoin}
          disabled={full}
          className="mt-3.5 h-11 w-full rounded-full font-display font-semibold"
        >
          {full ? 'Slots full' : tournament.entry_fee ? `Join · ${coins(tournament.entry_fee)} coins` : 'Join free'}
        </Button>
      )}
    </article>
  );
}