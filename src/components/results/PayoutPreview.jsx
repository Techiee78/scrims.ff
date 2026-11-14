import { Coins, Trophy } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';

const PLACES = [
  { key: 'first', label: '1st', medal: '🥇' },
  { key: 'second', label: '2nd', medal: '🥈' },
  { key: 'third', label: '3rd', medal: '🥉' },
];

export default function PayoutPreview({
  prize1 = 0,
  prize2 = 0,
  prize3 = 0,
  perKill = 0,
  payable = 0,
  prizePool = 0,
}) {
  const values = { first: prize1, second: prize2, third: prize3 };
  const over = prize1 + prize2 + prize3 > prizePool && prizePool > 0;

  return (
    <div className="glass rounded-[22px] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          Winnings distribution
        </span>
        <span className="flex items-center gap-1 font-display text-sm font-semibold">
          <Coins className="h-3.5 w-3.5 text-primary" />
          {formatCoins(payable)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {PLACES.map((place) => (
          <div key={place.key} className="rounded-xl bg-white/[0.03] px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {place.medal} {place.label}
            </p>
            <p className="font-display text-xs font-semibold">{formatCoins(values[place.key])} coins</p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Per kill</span>
        <span className="font-display text-xs font-semibold">{formatCoins(perKill)} coins</span>
      </div>

      {over && (
        <p className="mt-2 text-[10px] text-destructive">
          Podium prizes are more than the {formatCoins(prizePool)} coin pool.
        </p>
      )}
    </div>
  );
}