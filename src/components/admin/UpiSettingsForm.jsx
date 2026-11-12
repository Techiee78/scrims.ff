import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { adminSaveUpiSettings } from '@/lib/deposits';
import { useToast } from '@/components/ui/use-toast';

export default function UpiSettingsForm({ settings, onSaved }) {
  const [upiId, setUpiId] = useState(settings?.upiId || '');
  const [payeeName, setPayeeName] = useState(settings?.payeeName || 'Scrims.ff');
  const [active, setActive] = useState(Boolean(settings?.active));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const saved = await adminSaveUpiSettings({ upiId: upiId.trim(), payeeName: payeeName.trim(), active });
      setActive(Boolean(saved?.settings?.active));
      onSaved?.();
      toast({ title: 'UPI settings saved', description: active ? 'Players can pay now.' : 'Payments paused.' });
    } catch (err) {
      setError(err.message || 'Could not save the UPI settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass space-y-3 rounded-[24px] p-4">
      <div>
        <h2 className="font-display text-sm font-semibold">Collection UPI</h2>
        <p className="text-[10px] text-muted-foreground">
          Players pay on this UPI ID. Every payment is approved by hand before coins are added.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">UPI ID</span>
        <input
          type="text"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="scrimsff@okaxis"
          className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Payee name</span>
        <input
          type="text"
          value={payeeName}
          onChange={(e) => setPayeeName(e.target.value)}
          placeholder="Scrims.ff"
          className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
        />
      </label>

      <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2">
        <div>
          <p className="text-xs font-medium">Accept coin payments</p>
          <p className="text-[10px] text-muted-foreground">{active ? 'QR is live for players' : 'Players cannot pay right now'}</p>
        </div>
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className={`h-7 w-12 rounded-full p-0.5 transition-colors ${active ? 'bg-primary' : 'bg-white/15'}`}
          aria-pressed={active}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-background transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save UPI settings
      </button>
    </section>
  );
}