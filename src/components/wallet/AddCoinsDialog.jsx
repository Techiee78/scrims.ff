import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Copy, Loader2, QrCode, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { coins as formatCoins } from '@/lib/format';
import { COINS_MAX, COINS_MIN, buildUpiLink, submitDepositRequest, upiQrUrl } from '@/lib/deposits';
import DepositStatusPill from '@/components/wallet/DepositStatusPill';
import AutoPayStep from '@/components/wallet/AutoPayStep';
import FormSelect from '@/components/admin/FormSelect';

const PRESETS = [100, 500, 1500];

// Preset amounts plus a custom entry, in the same glass select the admin forms
// use instead of a button grid followed by a bare number field.
const AMOUNT_OPTIONS = [
  ...PRESETS.map((value) => ({
    value: String(value),
    label: `${formatCoins(value)} coins · ₹${formatCoins(value)}`,
  })),
  { value: 'custom', label: 'Other amount' },
];

export default function AddCoinsDialog({ open, onOpenChange, settings, onSubmitted }) {
  const [step, setStep] = useState('amount');
  const [choice, setChoice] = useState('500');
  const [custom, setCustom] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const chosen = choice === 'custom' ? Number(custom) : Number(choice);
  const amountOk = Number.isInteger(chosen) && chosen >= COINS_MIN && chosen <= COINS_MAX;
  // The admin chooses one mode for the whole app: manual UPI QR + approval, or
  // the automatic NexUPI page where the payment confirms itself.
  const auto = settings?.mode === 'automatic';
  const upiId = settings?.upiId || '';
  const ready = auto ? Boolean(settings?.nexupiReady) : Boolean(upiId);
  const link = upiId ? buildUpiLink({ upiId, payeeName: settings?.payeeName, amount: chosen }) : '';

  const handleOpen = (next) => {
    if (!next) {
      setStep('amount');
      setReference('');
      setNote('');
      setError('');
      setCustom('');
      setChoice('500');
    }
    onOpenChange(next);
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      toast({ title: 'UPI ID copied' });
    } catch (_e) {
      toast({ title: 'UPI ID', description: upiId });
    }
  };

  const send = async () => {
    setError('');
    const utr = reference.replace(/\D/g, '');
    if (utr.length !== 12) {
      setError('Enter the 12-digit UTR shown in your payment app.');
      return;
    }
    setBusy(true);
    try {
      await submitDepositRequest({ coins: chosen, reference: utr, note: note.trim() });
      setStep('done');
      onSubmitted?.();
    } catch (err) {
      setError(err.message || 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="glass-strong max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-[26px] border-white/10 p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-base">Add coins</DialogTitle>
          <DialogDescription className="text-sm">
            {step === 'amount' && '₹1 = 1 coin. Pick an amount to pay.'}
            {step === 'pay' &&
              (auto
                ? 'Pay on the UPI page — coins are added the moment it confirms.'
                : 'Pay on the UPI QR, then send the reference for verification.')}
            {step === 'done' && 'Sent. The admin will verify your payment.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs tracking-tight text-muted-foreground">Amount</span>
              <FormSelect
                value={choice}
                onChange={(value) => {
                  setChoice(value);
                  if (value !== 'custom') setCustom('');
                }}
                options={AMOUNT_OPTIONS}
                className="glass-soft h-11 w-full rounded-2xl border-white/10 px-3 text-sm"
              />
            </label>

            {choice === 'custom' && (
              <label className="block">
                <span className="mb-1 block text-xs tracking-tight text-muted-foreground">
                  Coins ({COINS_MIN}–{COINS_MAX})
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={COINS_MIN}
                  max={COINS_MAX}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="e.g. 250"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
                />
              </label>
            )}

            <p className="text-xs text-muted-foreground">
              Daily limit: ₹5,000 per day (₹1 = 1 coin).
            </p>

            {!amountOk && (choice !== 'custom' || custom.trim() !== '') && (
              <p className="text-xs text-destructive">
                Enter a whole number between {COINS_MIN} and {COINS_MAX} coins.
              </p>
            )}
            {!ready && (
              <p className="rounded-2xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
                Coin payments are not set up yet. Please try again later.
              </p>
            )}

            <button
              type="button"
              disabled={!amountOk || !ready}
              onClick={() => setStep('pay')}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {auto ? <Zap className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
              Pay ₹{formatCoins(Number.isFinite(chosen) ? chosen : 0)}
              {auto ? ' · instant UPI' : ' · show UPI QR'}
            </button>
          </div>
        )}

        {step === 'pay' && (auto ? (
          <AutoPayStep
            coins={chosen}
            onPaid={onSubmitted}
            onDone={() => handleOpen(false)}
            onBack={() => setStep('amount')}
          />
        ) : (
          <div className="space-y-3">
            <div className="glass-soft flex flex-col items-center gap-2 rounded-[22px] p-4">
              <Image
                src={upiQrUrl(link)}
                alt="UPI payment QR code"
                className="h-52 w-52 rounded-2xl bg-white p-2"
              />
              <p className="font-display text-sm font-semibold">₹{formatCoins(chosen)}</p>
              <button
                type="button"
                onClick={copyUpi}
                className="glass-soft flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium"
              >
                <Copy className="h-3 w-3" />
                {upiId}
              </button>
              <a
                href={link}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open in UPI app
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs tracking-tight text-muted-foreground">
                UPI reference / UTR
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={reference}
                onChange={(e) => setReference(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="12-digit reference from your UPI app"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm uppercase outline-none focus:border-primary/60"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs tracking-tight text-muted-foreground">
                Note for admin (optional)
              </span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. paid from 98xxxxxx12"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
              />
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              I have paid — send for verification
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('amount');
                setError('');
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Change amount
            </button>
          </div>
        ))}

        {step === 'done' && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <DepositStatusPill status="pending" />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCoins(chosen)} coins will be added to your wallet once the admin verifies your ₹
              {formatCoins(chosen)} payment. You can track it under “Deposits”.
            </p>
            <button
              type="button"
              onClick={() => handleOpen(false)}
              className="h-11 w-full rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground"
            >
              Done
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}