import { Flame } from 'lucide-react';
import { initials } from '@/lib/format';

export default function TopBar({ user, onProfile }) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-40 px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between md:max-w-2xl">
        <div className="glass flex items-center gap-2 rounded-full py-2 pl-2 pr-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Flame className="h-3.5 w-3.5" />
          </span>
          <span className="font-display text-sm font-semibold tracking-tight">
            Scrims<span className="text-primary">.ff</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onProfile}
          aria-label="Profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-xs font-semibold text-primary-foreground">
            {initials(user)}
          </span>
        </button>
      </div>
    </header>
  );
}