import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Coins, Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { coins as formatCoins } from '@/lib/format';

export default function Wallet() {
  const [data, setData] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke('getWalletOverview', {})
      .then((res) => setData(res?.data ?? res))
      .catch(() => setData({ wallet: { balance: 0, total_won: 0 }, transactions: [] }));
  }, []);

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
      </section>

      <div className="space-y-3">
        <h2 className="px-1 font-display text-sm font-semibold">Recent activity</h2>

        {transactions.length === 0 && (
          <div className="glass rounded-[26px] px-6 py-8 text-center text-xs text-muted-foreground">
            No transactions yet.
          </div>
        )}

        {transactions.map((item) => {
          const isCredit = item.type === 'credit';
          const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
          return (
            <div key={item.id} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3">
              <span className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Icon className={isCredit ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-primary'} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label || 'Transaction'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.balance_after !== undefined ? `Balance ${formatCoins(item.balance_after)}` : ''}
                </p>
              </div>
              <span
                className={
                  isCredit
                    ? 'font-display text-sm font-semibold text-accent'
                    : 'font-display text-sm font-semibold text-foreground'
                }
              >
                {isCredit ? '+' : '−'}
                {formatCoins(item.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}