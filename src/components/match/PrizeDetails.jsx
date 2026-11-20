import { Trophy } from 'lucide-react';
import { coins } from '@/lib/format';
import { podiumSplit } from '@/lib/prizes';

export default function PrizeDetails({ tournament }) {
  const split = podiumSplit(tournament);
  const places = [
    { rank: '1ST', amount: split.first },
    { rank: '2ND', amount: split.second },
    { rank: '3RD', amount: split.third },
  ].filter((place) => Number(place.amount) > 0);

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1.5 px-1 font-display text-sm font-semibold text-accent">
        <Trophy className="h-3.5 w-3.5" />
        Prize details
      </h2>
      <div className="glass-soft grid grid-cols-3 gap-2 rounded-2xl px-3 py-3">
        {places.length === 0 && (
          <p className="col-span-3 text-xs text-muted-foreground">Prize pool is announced soon.</p>
        )}
        {places.map((place) => (
          <div key={place.rank} className="text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {place.rank}
            </p>
            <p className="font-display text-sm font-semibold text-primary">{coins(place.amount)}</p>
          </div>
        ))}
      </div>
      {Number(tournament.per_kill || 0) > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          + {coins(tournament.per_kill)} coins per kill
        </p>
      )}
    </section>
  );
}