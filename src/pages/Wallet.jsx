import { useCallback, useEffect, useState } from 'react';
import { Coins, Plus, Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { coins as formatCoins } from '@/lib/format';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import AddCoinsDialog from '@/components/wallet/AddCoinsDialog';

export default function Wallet() {
  const [data, setData] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadWallet = useCallback(() => {
    base44.functions
      .invoke('getWalletOverview', {})
      .then((res) => setData(res?.data ?? res))
      .catch(() => setData({ wallet: { balance: 0, total_won: 0 }, transactions: [] }));
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-[30px] bg-white/5" />
        <div className="h-32 animate-pulse rounded-[26px] bg-white/5" />
      </div>
    );
  }

  const { wallet, transactions = [] } = data;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="font-display text-2xl font-semibold">Wallet</h1>
        <p className="text-xs text-muted-foreground">Entry fees and winnings, all in one place.</p>
      </div>

      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-primary/25 via-[#0B0817]/80 to-accent/20 p-5 shadow-[0_18px_60px_rgba(3,2,12,0.5)] backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Coins className="h-3.5 w-3.5 text-primary" />
            Balance
          </span>
          <span className="glass-soft flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            <Trophy className="h-3 w-3 text-primary" />
            {formatCoins(wallet?.total_won)} won
          </span>
        </div>
        <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {formatCoins(wallet?.balance)}
          <span className="ml-2 text-sm font-medium text-muted-foreground">coins</span>
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Coins are in-app credits used for entry fees.
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add coins
        </button>
      </section>

      <TransactionHistory transactions={transactions} />

      <AddCoinsDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={loadWallet}
      />
    </div>
  );
}