import { useState } from 'react';
import { ArrowLeft, Loader2, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { coins as formatCoins } from '@/lib/format';
import { WITHDRAW_MAX, WITHDRAW_MIN, submitWithdrawal } from '@/lib/withdrawals';
import DepositStatusPill from '@/components/wallet/DepositStatusPill';

const PRESETS = [100, 500, 1000];

export default function WithdrawDialog({ open, onOpenChange, available = 0, onSubmitted }) {
  const [step, setStep] = useState('form');
  const [preset, setPreset] = useState(100);
  const [custom, setCustom] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chosen = custom.trim() === '' ? preset : Number(custom);
  const amountOk = Number.isInteger(chosen) && chosen >= WITHDRAW_MIN && chosen <= WITHDRAW_MAX;
  const withinBalance = amountOk && chosen <= available;

  const handleOpen = (next) => {
    if (!next) {
      setStep('form');
      setError('');
      setCustom('');
      setPreset(100);
      setNote('');
    }
    onOpenChange(next);
  };

  const send = async () => {
    setError('');
    if (!withinBalance) {
      setError(`You can withdraw up to ${formatCoins(available)} coins of winnings right now.`);
      return;
    }
    if (upiId.trim().length < 5 || !upiId.includes('@')) {
      setError('Enter the UPI ID where you want to receive the money.');
      return;
    }
    if (accountName.trim().length < 2) {
      setError('Enter the name on your UPI account.');
      return;
    }
    setBusy(true);
    try {
      await submitWithdrawal({
        coins: chosen,
        upiId: upiId.trim(),
        accountName: accountName.trim(),
        note: note.trim(),
      });
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
          <DialogTitle className="font-display text-base">Withdraw coins</DialogTitle>
          <DialogDescription className="text-[11px]">
            {step === 'form' && 'Only your tournament winnings can be withdrawn. ₹1 = 1 coin, paid by hand to your UPI.'}
            {step === 'done' && 'Sent. The admin will review your request.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Winnings withdrawable</span>
              <span className="font-display text-sm font-semibold">{formatCoins(available)} coins</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((value) => {
                const active = custom.trim() === '' && preset === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPreset(value);
                      setCustom('');
                    }}
                    className={`glass-soft rounded-2xl px-2 py-2.5 text-center transition-colors ${
                      active ? 'border-primary/60 ring-1 ring-primary/60' : ''
                    }`}
                  >
                    <span className="block font-display text-sm font-semibold">{formatCoins(value)}</span>
                    <span className="block text-[10px] text-muted-foreground">coins</span>
                  </button>
                );
              })}
            </div>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Or enter coins ({WITHDRAW_MIN}–{WITHDRAW_MAX})
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={WITHDRAW_MIN}
                max={WITHDRAW_MAX}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="e.g. 250"
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Your UPI ID
              </span>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okaxis"
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Name on the account
              </span>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Full name as per UPI"
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Note for admin (optional)
              </span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. please send before 6 pm"
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
              />
            </label>

            {!amountOk && (
              <p className="text-[10px] text-destructive">
                Enter a whole number between {WITHDRAW_MIN} and {WITHDRAW_MAX} coins.
              </p>
            )}
            {amountOk && !withinBalance && (
              <p className="text-[10px] text-destructive">
                Only {formatCoins(available)} coins of winnings are withdrawable right now.
              </p>
            )}
            {error && <p className="text-[11px] text-destructive">{error}</p>}

            <button
              type="button"
              onClick={send}
              disabled={busy || !withinBalance}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Request ₹{formatCoins(Number.isFinite(chosen) ? chosen : 0)} withdrawal
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <DepositStatusPill status="pending" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              The admin will pay ₹{formatCoins(chosen)} to {upiId.trim()} and approve it. Coins are
              deducted only after the payout is approved. You can track it under “Withdrawals”.
            </p>
            <button
              type="button"
              onClick={() => handleOpen(false)}
              className="h-10 w-full rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => setStep('form')}
              className="flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Send another request
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}