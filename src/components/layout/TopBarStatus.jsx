import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';
import { coins as formatCoins } from '@/lib/format';
import IstClock from './IstClock';

// Hero status chip: live coin balance (tap to open the wallet) next to the IST clock.
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
    <div className="glass flex items-center gap-2 rounded-full py-2 pl-3 pr-3">
      <Link
        to="/wallet"
        aria-label="Coin balance"
        className="flex items-center gap-1 transition-opacity hover:opacity-80"
      >
        <Coins className="h-3.5 w-3.5 text-primary" />
        <span className="font-display text-xs font-semibold tabular-nums tracking-tight text-foreground">
          {balance == null ? '···' : formatCoins(balance)}
        </span>
      </Link>
      <span className="h-3.5 w-px bg-white/15" />
      <IstClock compact />
    </div>
  );
}