import { useState } from 'react';
import { Coins, Loader2, Sparkles, X } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';

const PACKS = [
  { coins: 100, price: '₹20', tag: 'Starter' },
  { coins: 500, price: '₹90', tag: 'Popular' },
  { coins: 1500, price: '₹250', tag: 'Best value' },
];

export default function AddCoinsDialog({ open, onClose }) {
  const [selected, setSelected] = useState(null);

  if (!open) return null;

  const handleTopUp = () => {
    // Coin purchase flow is not yet enabled — inform the user for now.
    setSelected(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-strong relative w-full max-w-md rounded-t-[30px] p-5 sm:rounded-[30px]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Add coins</h2>
            <p className="text-xs text-muted-foreground">Top up your balance to join tournaments.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-soft flex h-8 w-8 items-center justify-center rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {PACKS.map((pack) => {
            const active = selected === pack.coins;
            return (
              <button
                key={pack.coins}
                type="button"
                onClick={() => setSelected(pack.coins)}
                className={`glass flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-colors ${
                  active ? 'border-primary/60 ring-1 ring-primary/60' : ''
                }`}
              >
                <span className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Coins className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatCoins(pack.coins)} coins</p>
                  <p className="text-[11px] text-muted-foreground">{pack.tag}</p>
                </div>
                <span className="font-display text-sm font-semibold">{pack.price}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selected}
          onClick={handleTopUp}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground shadow disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" />
          {selected ? `Top up ${formatCoins(selected)} coins` : 'Select a pack'}
          <Loader2 className="hidden" />
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Payments are coming soon. Coin packs will be available shortly.
        </p>
      </div>
    </div>
  );
}