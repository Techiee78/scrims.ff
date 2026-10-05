import { Input } from '@/components/ui/input';
import AdminStandingsPreview from '@/components/results/AdminStandingsPreview';

export default function ResultRow({ registration, kills, placement, onKills, onPlacement }) {
  return (
    <div className="glass-soft rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-muted-foreground">
          #{registration.slot_number || '–'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {registration.ff_ign || registration.user_name || 'Player'}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {registration.ff_uid || registration.user_email}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Input
            aria-label="Kills"
            value={kills}
            onChange={(event) => onKills(event.target.value)}
            inputMode="numeric"
            placeholder="Kills"
            className="h-9 w-16 rounded-xl border-white/10 text-center text-xs"
          />
          <Input
            aria-label="Placement"
            value={placement}
            onChange={(event) => onPlacement(event.target.value)}
            inputMode="numeric"
            placeholder="Place"
            className="h-9 w-16 rounded-xl border-white/10 text-center text-xs"
          />
        </div>
      </div>
      {registration.standings_screenshot && (
        <AdminStandingsPreview registration={registration} />
      )}
    </div>
  );
}