import { Swords, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MATCH_MODES = [
  { id: 'Full Map', label: 'Full Map', hint: 'Battle Royale', icon: Target },
  { id: 'CS', label: 'CS', hint: 'Clash Squad', icon: Swords },
];

export const ALL_MODES = [{ id: 'All', label: 'All', hint: 'Everything', icon: Sparkles }];

export default function ModeTabs({ value, onChange, options = MATCH_MODES }) {
  return (
    <div
      className="glass-soft grid gap-1 rounded-[26px] p-1.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(({ id, label, hint, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-3xl px-3 py-2.5 transition-all duration-300',
              active
                ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_6px_24px_rgba(56,189,248,0.32)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-1.5">
              <Icon className="h-4 w-4" />
              <span className="font-display text-sm font-semibold tracking-tight">{label}</span>
            </span>
            <span
              className={cn(
                'text-[9px] font-medium uppercase tracking-[0.14em]',
                active ? 'text-primary-foreground/75' : 'text-muted-foreground/70'
              )}
            >
              {hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}