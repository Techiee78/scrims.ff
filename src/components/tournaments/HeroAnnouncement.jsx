import { useEffect, useState } from 'react';
import { Check, Clock, Coins, Lock, MapPin, Trophy, Zap } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import SlotBar from './SlotBar';
import StatTile from './StatTile';
import LiveStatus from './LiveStatus';
import { coins, matchTime, startsIn } from '@/lib/format';
import { slotCapacity } from '@/lib/slots';
import { getTimeStatus } from '@/lib/tournamentTime';

export default function HeroAnnouncement({ tournament, joined, onJoin }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const capacity = slotCapacity(tournament.mode, tournament.team_type);
  const full = (tournament.filled_slots || 0) >= capacity;
  const timeStatus = getTimeStatus(tournament, now);
  const entryClosed = timeStatus === 'live' || timeStatus === 'completed';

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0B0817]/70 shadow-[0_18px_60px_rgba(3,2,12,0.55)] backdrop-blur-2xl">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={tournament.banner_url}
          alt={tournament.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0B0817]/45" />
        <div className="absolute left-4 top-4">
          <LiveStatus tournament={tournament} now={now} />
        </div>
      </div>

      <div className="relative -mt-8 space-y-4 p-5">
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight">{tournament.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="glass-soft rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-accent">
              {tournament.mode}
            </span>
            <span className="glass-soft rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {tournament.team_type || 'Solo'}
            </span>
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

        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={Trophy} label="Prize pool" value={coins(tournament.prize_pool)} />
          <StatTile icon={Coins} label="Entry" value={tournament.entry_fee ? coins(tournament.entry_fee) : 'Free'} />
          <StatTile icon={Zap} label="Per kill" value={coins(tournament.per_kill)} />
        </div>

        <SlotBar filled={tournament.filled_slots || 0} total={capacity} />

        {joined ? (
          <div className="glass-soft flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium">
            <Check className="h-4 w-4 text-accent" />
            You're in — details in My Matches
          </div>
        ) : entryClosed ? (
          <div className="glass-soft flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            {timeStatus === 'live' ? 'Match is live — entry closed' : 'Entry closed — match completed'}
          </div>
        ) : full ? (
          <div className="glass-soft flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            All slots are full
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              onClick={onJoin}
              className="h-12 flex-1 rounded-full font-display text-sm font-semibold"
            >
              {tournament.entry_fee ? `Join · ${coins(tournament.entry_fee)} coins` : 'Join free'}
            </Button>
            <span className="text-[11px] font-medium text-muted-foreground">
              {startsIn(tournament.match_time)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}