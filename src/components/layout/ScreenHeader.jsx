import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TAB_ROOTS, tabRootOf } from './TabMemory';

// Where to land when the WebView has no history to go back to.
function fallbackPath(pathname) {
  if (pathname === '/admin') return '/';
  if (pathname.startsWith('/admin/')) return '/admin';
  if (pathname.startsWith('/wallet') || pathname.startsWith('/payment-return')) return '/wallet';
  return tabRootOf(pathname) || TAB_ROOTS[0];
}

// One header for every screen that is not a bottom tab: a back control with a
// guaranteed 44x44 tap area, the screen title and an optional action slot.
export default function ScreenHeader({
  title,
  subtitle,
  icon: Icon,
  right = null,
  onBack,
  showBack = true,
  className,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    // React Router keeps an index in history state; without history (a cold
    // WebView start or a deep link) walking back would leave the app.
    const index = window.history.state?.idx;
    if (typeof index === 'number' && index > 0) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath(pathname), { replace: true });
  };

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {showBack && (
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="glass-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-opacity active:opacity-70"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && (
          <h1 className="truncate font-display text-lg font-semibold leading-tight">{title}</h1>
        )}
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}