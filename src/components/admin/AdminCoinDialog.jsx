import { useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { coins as formatCoins } from '@/lib/format';
import { adjustCoins } from '@/lib/adminWallet';
import { cn } from '@/lib/utils';

const PRESETS = [50, 100, 500, 1000];

export default function AdminCoinDialog({ user, balance = 0, open, onOpenChange, onDone }) {
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const value = Number(amount);
  const valid = Number.isInteger(value) && value > 0;

  const reset = () => {
    setMode('add');
    setAmount('');
    setNote('');
    setError('');
  };

  const handleOpenChange = (next) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (!valid) {
      setError('Enter a whole number of coins.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const newBalance = await adjustCoins(user.email, mode === 'add' ? value : -value, note);
      onDone?.(user, newBalance, mode, value);
      handleOpenChange(false);
    } catch (err) {
      setError(err.message || 'Could not update the wallet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-strong rounded-[26px] border-white/12">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Manage coins</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {user?.full_name || user?.email} · current balance {formatCoins(balance)} coins
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'add', label: 'Add coins', icon: Plus },
              { id: 'remove', label: 'Remove coins', icon: Minus },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  'flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors',
                  mode === id
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-white/10 bg-white/5 text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={cn(
                  'min-h-[44px] rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                  Number(amount) === preset
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-white/10 bg-white/5 text-muted-foreground'
                )}
              >
                {formatCoins(preset)}
              </button>
            ))}
          </div>

          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="Coins"
            className="h-11"
          />

          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (optional)"
            className="h-11"
          />

          {valid && (
            <p className="text-xs text-muted-foreground">
              New balance will be{' '}
              <span className="font-semibold text-foreground">
                {formatCoins(
                  Math.max(0, balance + (mode === 'add' ? value : -value))
                )}{' '}
                coins
              </span>
            </p>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">{error}</div>
          )}

          <Button
            onClick={submit}
            disabled={busy || !valid}
            className="h-11 w-full rounded-full font-semibold"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'add' ? (
              `Add ${valid ? formatCoins(value) : ''} coins`
            ) : (
              `Remove ${valid ? formatCoins(value) : ''} coins`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}