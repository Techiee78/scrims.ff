import { NavLink } from 'react-router-dom';
import { Home, Trophy, Swords, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/tournaments', label: 'Tournament', icon: Trophy },
  { to: '/my-matches', label: 'My Matches', icon: Swords },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
];

export default function GlassNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div className="glass mx-auto flex w-full max-w-md items-center gap-1 rounded-[28px] p-1.5 md:max-w-2xl">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 rounded-3xl px-1 py-2.5 text-[10px] font-bold transition-colors duration-300',
                isActive ? 'text-primary' : 'text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] transition-transform duration-300',
                    isActive ? 'scale-110 text-primary' : 'text-white'
                  )}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}