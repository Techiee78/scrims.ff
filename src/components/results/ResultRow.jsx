import { Input } from '@/components/ui/input';
import InputShell from '@/components/common/InputShell';
import { coins as formatCoins } from '@/lib/format';
import AdminStandingsPreview from '@/components/results/AdminStandingsPreview';

const cellInput =
  'h-full w-full border-0 bg-transparent px-0 text-center text-sm focus-visible:ring-0 focus-visible:ring-offset-0';

export default function ResultRow({ registration, kills, placement, onKills, onPlacement, payout = 0 }) {
  return (
    <div className="glass-soft rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-muted-foreground">
          #{registration.slot_number || '–'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {registration.ff_ign || registration.user_name || 'Player'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {registration.ff_uid || registration.user_email}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InputShell className="h-10 w-[72px] px-1.5">
            <Input
              aria-label="Kills"
              value={kills}
              onChange={(event) => onKills(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Kills"
              className={cellInput}
            />
          </InputShell>
          <InputShell className="h-10 w-[72px] px-1.5">
            <Input
              aria-label="Placement"
              value={placement}
              onChange={(event) => onPlacement(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Place"
              className={cellInput}
            />
          </InputShell>
        </div>
      </div>
      {payout > 0 && (
        <p className="mt-1.5 text-right text-xs font-semibold text-primary">
          +{formatCoins(payout)} coins winnings
        </p>
      )}
      {registration.standings_screenshot && (
        <AdminStandingsPreview registration={registration} />
      )}
    </div>
  );
}