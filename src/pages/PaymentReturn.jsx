import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

/**
 * Landing page after the UPI payment. The provider opens it in its own tab, so
 * it tells the app tab that the payment is done and closes itself — the player
 * stays in the tab they started from.
 */
export default function PaymentReturn() {
  const navigate = useNavigate();
  const [stayedOpen, setStayedOpen] = useState(false);

  useEffect(() => {
    try {
      window.opener?.postMessage({ type: 'nexupi:paid' }, window.location.origin);
    } catch (_e) {
      /* nothing to signal — the app tab still polls */
    }
    window.close();
    const timer = setTimeout(() => setStayedOpen(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong w-full max-w-sm rounded-[26px] p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
        <p className="mt-3 font-display text-sm font-semibold">Payment successful</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Your coins are being added to the wallet.
        </p>
        <button
          type="button"
          onClick={() => navigate('/wallet', { replace: true })}
          className="mt-4 h-10 w-full rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground"
        >
          {stayedOpen ? 'Back to wallet' : 'Open wallet'}
        </button>
      </div>
    </div>
  );
}