import { useEffect, useState } from 'react';
import { Check, Clock, Coins, Lock, MapPin, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SlotBar from './SlotBar';
import StatTile from './StatTile';
import LiveStatus from './LiveStatus';
import StandingsUpload from '@/components/matches/StandingsUpload';
import { coins, matchTime } from '@/lib/format';
import { podiumSplit } from '@/lib/prizes';
import { slotCapacity } from '@/lib/slots';
import { getTimeStatus } from '@/lib/tournamentTime';

export default function TournamentCard({ tournament, joined, registration, onJoin, onUploaded }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const capacity = slotCapacity(tournament.mode, tournament.team_type);
  const full = (tournament.filled_slots || 0) >= capacity;
  const timeStatus = getTimeStatus(tournament, now);

  return (
    <article className="glass rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="glass-soft inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              {tournament.mode}
            </span>
            <span className="glass-soft inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {tournament.team_type || 'Solo'}
            </span>
            <LiveStatus tournament={tournament} now={now} />
          </div>
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
        <StatTile icon={Trophy} label="1st prize" value={coins(podiumSplit(tournament).first)} />
      </div>

      <div className="mt-3.5">
        <SlotBar filled={tournament.filled_slots || 0} total={capacity} />
      </div>

      {joined ? (
        <>
          <div className="glass-soft mt-3.5 flex items-center gap-2 rounded-2xl px-3 py-2.5">
            <Check className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium">Slot booked — room details are in My Matches</span>
          </div>
          {timeStatus === 'completed' && registration && (
            <StandingsUpload registration={registration} onUploaded={onUploaded} />
          )}
        </>
      ) : timeStatus === 'live' ? (
        <div className="glass-soft mt-3.5 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-destructive">
          <Zap className="h-4 w-4" />
          <span className="text-xs font-medium">Match is live — entry closed</span>
        </div>
      ) : timeStatus === 'completed' ? (
        <div className="glass-soft mt-3.5 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-medium">Entry closed — match completed</span>
        </div>
      ) : full ? (
        <div className="glass-soft mt-3.5 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-medium">All slots are full</span>
        </div>
      ) : (
        <Button
          onClick={onJoin}
          className="mt-3.5 h-11 w-full rounded-full font-display font-semibold"
        >
          {tournament.entry_fee ? `Join · ${coins(tournament.entry_fee)} coins` : 'Join free'}
        </Button>
      )}
    </article>
  );
}