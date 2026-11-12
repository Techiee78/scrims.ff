import { format } from 'date-fns';
import { Wallet } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';
import DepositStatusPill from '@/components/wallet/DepositStatusPill';

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'd MMM · h:mm a');
}

export default function WithdrawalRequestsList({ requests = [] }) {
  if (requests.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-sm font-semibold">Withdrawals</h2>
        <span className="text-[11px] text-muted-foreground">{requests.length} total</span>
      </div>

      {requests.map((request) => (
        <div key={request.id} className="glass space-y-1.5 rounded-[22px] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">
                {formatCoins(request.coins)} coins
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  ₹{formatCoins(request.coins)}
                </span>
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                To {request.payout_upi} · {request.account_name}
              </p>
              <p className="text-[10px] text-muted-foreground">{when(request.created_at)}</p>
            </div>
            <DepositStatusPill status={request.status} />
          </div>

          {request.status === 'pending' && (
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Wallet className="h-3 w-3" />
              Waiting for the admin to pay and approve. Coins are held until then.
            </p>
          )}
          {request.status === 'approved' && (
            <p className="text-[10px] text-emerald-300">
              Paid out{request.decision?.payout_ref ? ` · ref ${request.decision.payout_ref}` : ''}
              {request.decision?.balance_after != null
                ? ` · balance ${formatCoins(request.decision.balance_after)}`
                : ''}
              .
            </p>
          )}
          {request.status === 'rejected' && (
            <p className="text-[10px] text-destructive">
              Rejected — {request.decision?.reason || 'payout could not be completed'}. Coins are back in your balance.
            </p>
          )}
        </div>
      ))}
    </section>
  );
}