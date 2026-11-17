import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';
import { checkInstantPayment, startInstantPayment } from '@/lib/payments';

const POLL_MS = 6000;
// NexUPI orders expire after 30 minutes.
const WINDOW_MS = 30 * 60 * 1000;

export default function AutoPayStep({ coins, onPaid, onDone, onBack }) {
  const [phase, setPhase] = useState('starting'); // starting | waiting | paid | failed | error
  const [paymentUrl, setPaymentUrl] = useState('');
  const [error, setError] = useState('');
  const [left, setLeft] = useState(WINDOW_MS);
  const orderRef = useRef('');
  const doneRef = useRef(false);

  const check = useCallback(async () => {
    if (!orderRef.current || doneRef.current) return;
    try {
      const res = await checkInstantPayment(orderRef.current);
      if (res?.status === 'approved') {
        doneRef.current = true;
        setPhase('paid');
        onPaid?.(res);
      } else if (res?.status === 'rejected') {
        doneRef.current = true;
        setPhase('failed');
        setError('This payment did not complete. No coins were added.');
      }
    } catch (_e) {
      // A failed check simply retries on the next tick.
    }
  }, [onPaid]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await startInstantPayment(coins);
        if (!alive) return;
        orderRef.current = res.orderId;
        setPaymentUrl(res.paymentUrl);
        setPhase('waiting');
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Could not start the payment.');
        setPhase('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [coins]);

  useEffect(() => {
    if (phase !== 'waiting') return undefined;
    const poll = setInterval(check, POLL_MS);
    const tick = setInterval(() => setLeft((value) => Math.max(0, value - 1000)), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [phase, check]);

  const minutes = String(Math.floor(left / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  if (phase === 'starting') {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-[11px]">Opening your payment page…</p>
      </div>
    );
  }

  if (phase === 'paid') {
    return (
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-300" />
        </div>
        <p className="font-display text-sm font-semibold">{formatCoins(coins)} coins added</p>
        <p className="text-[11px] text-muted-foreground">
          Payment confirmed. Your new balance is updated in the wallet.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="h-10 w-full rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground"
        >
          Done
        </button>
      </div>
    );
  }

  if (phase === 'failed' || phase === 'error') {
    return (
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <XCircle className="h-9 w-9 text-destructive" />
        </div>
        <p className="text-[11px] text-muted-foreground">{error || 'The payment was not completed.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="h-10 w-full rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass-soft space-y-2 rounded-[22px] p-4 text-center">
        <p className="font-display text-lg font-semibold">₹{formatCoins(coins)}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatCoins(coins)} coins · pay on the UPI page
        </p>
        <p className="text-[10px] text-muted-foreground">Order valid for {minutes}:{seconds}</p>
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground"
        >
          Open UPI payment page
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Waiting for the payment to confirm…
      </p>

      <button
        type="button"
        onClick={check}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] font-display text-xs font-semibold"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        I have paid — check now
      </button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Change amount
      </button>
    </div>
  );
}