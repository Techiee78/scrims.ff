import { Link } from 'react-router-dom';
import { RefreshCw, WifiOff, Hourglass, Lock, LogOut, Search, CheckCircle2, Ghost } from 'lucide-react';

// A single reusable screen for every empty / error / status state.
// variant drives the icon + accent; action is optional.
export default function StateScreen({
  variant = 'empty',
  title,
  hint,
  actionLabel,
  actionTo,
  onAction,
  showRetry = false,
  onRetry,
}) {
  const ICONS = {
    empty: Ghost,
    noResult: Search,
    error: RefreshCw,
    noInternet: WifiOff,
    slowInternet: Hourglass,
    permission: Lock,
    session: LogOut,
    success: CheckCircle2,
  };
  const Icon = ICONS[variant] ?? Ghost;

  return (
    <div className="glass flex flex-col items-center gap-2.5 rounded-[26px] px-6 py-10 text-center">
      <div className="glass-soft flex h-12 w-12 items-center justify-center rounded-full">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-display text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-[260px] text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-1 flex items-center gap-2">
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
        {actionLabel && (actionTo ? (
          <Link
            to={actionTo}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {actionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}