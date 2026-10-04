import { Check, Clock, Coins, MapPin, Trophy, Zap } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import SlotBar from './SlotBar';
import StatTile from './StatTile';
import { coins, matchTime, startsIn } from '@/lib/format';

export default function HeroAnnouncement({ tournament, joined, onJoin }) {
  const full = (tournament.filled_slots || 0) >= (tournament.total_slots || 0);

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0B0817]/70 shadow-[0_18px_60px_rgba(3,2,12,0.55)] backdrop-blur-2xl">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={tournament.banner_url}
          alt={tournament.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0817] via-[#0B0817]/40 to-transparent" />
        <span className="glass absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Latest tournament
        </span>
      </div>

      <div className="relative -mt-8 space-y-4 p-5">
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight">{tournament.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="glass-soft rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-accent">
              {tournament.mode}
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

        <SlotBar filled={tournament.filled_slots || 0} total={tournament.total_slots || 0} />

        {joined ? (
          <div className="glass-soft flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium">
            <Check className="h-4 w-4 text-accent" />
            You're in — details in My Matches
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              onClick={onJoin}
              disabled={full}
              className="h-12 flex-1 rounded-full font-display text-sm font-semibold"
            >
              {full ? 'Slots full' : tournament.entry_fee ? `Join · ${coins(tournament.entry_fee)} coins` : 'Join free'}
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