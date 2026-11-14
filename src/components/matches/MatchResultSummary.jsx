import { Coins, Crosshair, Medal } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function MatchResultSummary({ placement = 0, kills = 0, prize = 0 }) {
  const place = Number(placement) || 0;

  return (
    <div className="glass-soft mt-3.5 rounded-2xl px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Medal className="h-3 w-3 text-primary" />
        Your result
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Standing</p>
          <p className="font-display text-sm font-semibold">
            {place > 0 ? `${MEDALS[place] ? `${MEDALS[place]} ` : ''}#${place}` : '—'}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            <Crosshair className="h-2.5 w-2.5" />
            Kills
          </p>
          <p className="font-display text-sm font-semibold">{Number(kills) || 0}</p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            <Coins className="h-2.5 w-2.5" />
            Prize
          </p>
          <p
            className={`font-display text-sm font-semibold ${
              prize > 0 ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {prize > 0 ? `${formatCoins(prize)} coins` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}