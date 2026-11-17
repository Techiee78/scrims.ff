import { useState } from 'react';
import { Loader2, QrCode, Zap } from 'lucide-react';
import { adminSavePaymentMode } from '@/lib/payments';
import { useToast } from '@/components/ui/use-toast';

const MODES = [
  {
    key: 'manual',
    label: 'Manual',
    hint: 'Player pays on your UPI QR, you approve by hand.',
    icon: QrCode,
  },
  {
    key: 'automatic',
    label: 'Automatic',
    hint: 'NexUPI page — coins are credited the moment payment succeeds.',
    icon: Zap,
  },
];

export default function PaymentModeSwitch({ mode, nexupiReady, onSaved }) {
  const [current, setCurrent] = useState(mode || 'manual');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const pick = async (next) => {
    if (busy || next === current) return;
    if (next === 'automatic' && !nexupiReady) {
      setError('Add your NexUPI API token and both endpoint URLs in the Automatic tab first.');
      return;
    }
    setError('');
    setBusy(next);
    try {
      const saved = await adminSavePaymentMode(next);
      setCurrent(saved?.mode || next);
      onSaved?.();
      toast({
        title: next === 'automatic' ? 'Automatic payments on' : 'Manual payments on',
        description:
          next === 'automatic'
            ? 'Players pay on the NexUPI page and coins are credited instantly.'
            : 'Players pay on your UPI QR and you approve each request.',
      });
    } catch (err) {
      setError(err.message || 'Could not change the payment mode.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="glass space-y-3 rounded-[24px] p-4">
      <div>
        <h2 className="font-display text-sm font-semibold">Payment mode</h2>
        <p className="text-[10px] text-muted-foreground">
          One mode for the whole app. Manual keeps the UPI QR + admin approval; Automatic uses NexUPI.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((option) => {
          const active = current === option.key;
          const Icon = option.icon;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => pick(option.key)}
              disabled={Boolean(busy)}
              className={`rounded-2xl border px-3 py-3 text-left transition-colors disabled:opacity-70 ${
                active
                  ? 'border-primary/60 bg-primary/15'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-1.5 font-display text-xs font-semibold">
                {busy === option.key ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
                {option.label}
              </span>
              <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">{option.hint}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </section>
  );
}