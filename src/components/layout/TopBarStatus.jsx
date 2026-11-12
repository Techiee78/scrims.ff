import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';
import { coins as formatCoins } from '@/lib/format';
import IstClock from './IstClock';

// Hero status: coin balance (tap to open the wallet) and the IST clock as two
// separate chips.
export default function TopBarStatus() {
  const { data } = useQuery({
    queryKey: ['topbar-wallet'],
    queryFn: async () => {
      const res = await callFunction('getWalletOverview', await withAuth({}));
      return res?.data ?? res;
    },
    staleTime: 15000,
  });

  const balance = data?.wallet?.balance;

  return (
    <div className="flex items-center gap-1">
      <Link
        to="/wallet"
        aria-label="Coin balance"
        className="glass flex items-center gap-1 rounded-full px-2 py-2 transition-opacity hover:opacity-80"
      >
        <Coins className="h-3.5 w-3.5 text-primary" />
        <span className="font-display text-xs font-semibold tabular-nums tracking-tight text-foreground">
          {balance == null ? '···' : formatCoins(balance)}
        </span>
      </Link>

      <div className="glass flex items-center rounded-full px-2 py-2">
        <IstClock compact />
      </div>
    </div>
  );
}