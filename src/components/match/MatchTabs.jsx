import { FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'description', label: 'Description', icon: FileText },
  { id: 'members', label: 'Joined Members', icon: Users },
];

export default function MatchTabs({ value, onChange, memberCount }) {
  return (
    <div className="glass-soft grid grid-cols-2 gap-1 rounded-[26px] p-1.5">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex min-h-[44px] items-center justify-center gap-1.5 rounded-3xl px-2 py-2.5 font-display text-xs font-semibold tracking-tight transition-all duration-300',
              active
                ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_6px_24px_rgba(56,189,248,0.32)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === 'members' && memberCount > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                  active ? 'bg-primary-foreground/20' : 'bg-white/10'
                )}
              >
                {memberCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}