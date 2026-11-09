import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Trophy, Swords, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/tournaments', label: 'Tournament', icon: Trophy },
  { to: '/my-matches', label: 'My Matches', icon: Swords },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
];

const STEP = 8;

const glassStyle = {
  background:
    'linear-gradient(135deg, hsl(var(--primary) / 0.16), rgba(17, 27, 38, 0.44) 55%, hsl(var(--accent) / 0.13)), rgba(19, 31, 43, 0.3)',
  backdropFilter: 'blur(22px) saturate(190%)',
  WebkitBackdropFilter: 'blur(22px) saturate(190%)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  boxShadow: '0 8px 32px rgba(3, 2, 12, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
};

export default function GlassNav() {
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);
  const queued = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    const handleScroll = () => {
      if (queued.current) return;
      queued.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const diff = y - lastY.current;
        if (Math.abs(diff) >= STEP) {
          setCompact(diff > 0 && y > 40);
          lastY.current = y;
        }
        queued.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
    >
      <div
        className="mx-auto flex w-full max-w-md items-center gap-1 rounded-[28px] p-1.5 md:max-w-2xl"
        style={{
          ...glassStyle,
          transform: `scale(${compact ? 0.93 : 1})`,
          transformOrigin: 'bottom center',
          transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      >
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