import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

/**
 * Where the UPI payment page lands when it finishes (success, failure or
 * expiry). It runs inside the wallet's payment frame and asks the app to
 * re-check the order; opened on its own it closes itself.
 */
export default function PaymentReturn() {
  const navigate = useNavigate();
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const embedded = window.self !== window.top;
    try {
      window.parent.postMessage({ type: 'nexupi:check' }, window.location.origin);
      if (!embedded) window.opener?.postMessage({ type: 'nexupi:check' }, window.location.origin);
    } catch (_e) {
      /* nothing to signal — the wallet keeps checking on its own */
    }
    if (!embedded) window.close();
    setStandalone(!embedded);
    const timer = setTimeout(() => setStandalone(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-10">
      <div className="glass-strong w-full max-w-sm rounded-[26px] p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
        <p className="mt-3 font-display text-sm font-semibold">Checking your payment…</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Your coins appear in the wallet the moment the payment confirms.
        </p>
        {standalone && (
          <button
            type="button"
            onClick={() => navigate('/wallet', { replace: true })}
            className="mt-4 h-10 w-full rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground"
          >
            Back to wallet
          </button>
        )}
      </div>
    </div>
  );
}