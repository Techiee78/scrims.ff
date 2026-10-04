import { cn } from '@/lib/utils';

export default function SlotBar({ filled = 0, total = 0 }) {
  const full = total > 0 && filled >= total;
  const percent = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className={full ? 'text-destructive' : 'text-foreground/80'}>
          {full ? 'Slots full' : `${total - filled} slots left`}
        </span>
        <span className="text-muted-foreground">
          {filled}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            full ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-accent'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}