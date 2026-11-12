import { Coins, Trophy } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';

export default function PayoutPreview({ prizePool = 0, perKill = 0, payable = 0, players = 0 }) {
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

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">1st place</p>
          <p className="font-display text-xs font-semibold">{formatCoins(prizePool)} coins</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Per kill</p>
          <p className="font-display text-xs font-semibold">{formatCoins(perKill)} coins</p>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        {players > 0
          ? `${players} player${players === 1 ? '' : 's'} will get these coins in their wallet, credited once per match.`
          : 'Add kills or a 1st place to preview the distribution.'}
      </p>
    </div>
  );
}