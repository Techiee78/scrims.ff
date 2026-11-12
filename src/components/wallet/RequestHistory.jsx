import { format } from 'date-fns';
import { ArrowDownToLine, Plus } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';
import DepositStatusPill from '@/components/wallet/DepositStatusPill';

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'd MMM · h:mm a');
}

function statusNote(item) {
  const { kind, status } = item;
  if (status === 'pending') {
    return kind === 'deposit'
      ? 'Waiting for admin verification of your UPI payment.'
      : 'Waiting for the admin to pay and approve. Coins are held until then.';
  }
  if (status === 'approved') {
    if (kind === 'deposit') {
      return `Verified and credited${
        item.decision?.balance_after ? ` · balance ${formatCoins(item.decision.balance_after)}` : ''
      }.`;
    }
    return `Paid out${item.decision?.payout_ref ? ` · ref ${item.decision.payout_ref}` : ''}${
      item.decision?.balance_after != null ? ` · balance ${formatCoins(item.decision.balance_after)}` : ''
    }.`;
  }
  return kind === 'deposit'
    ? `Rejected — ${item.decision?.reason || 'payment could not be verified'}. No coins were added.`
    : `Rejected — ${item.decision?.reason || 'payout could not be completed'}. Coins are back in your balance.`;
}

export default function RequestHistory({ deposits = [], withdrawals = [] }) {
  const items = [
    ...deposits.map((row) => ({ ...row, kind: 'deposit' })),
    ...withdrawals.map((row) => ({ ...row, kind: 'withdrawal' })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (items.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-sm font-semibold">Deposit &amp; withdrawal requests</h2>
        <span className="text-[11px] text-muted-foreground">{items.length} total</span>
      </div>

      {items.map((item) => {
        const isDeposit = item.kind === 'deposit';
        const Icon = isDeposit ? Plus : ArrowDownToLine;
        return (
          <div key={`${item.kind}-${item.id}`} className="glass space-y-1.5 rounded-[22px] px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="glass-soft flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Icon className={`h-3.5 w-3.5 ${isDeposit ? 'text-primary' : 'text-accent'}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold">
                  {isDeposit ? 'Deposit' : 'Withdrawal'} · {formatCoins(item.coins)} coins
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    ₹{formatCoins(isDeposit ? item.amount_inr : item.coins)}
                  </span>
                </p>
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {isDeposit
                    ? `Ref ${item.reference}`
                    : `To ${item.payout_upi} · ${item.account_name}`}
                </p>
                <p className="text-[10px] text-muted-foreground">{when(item.created_at)}</p>
              </div>
              <DepositStatusPill status={item.status} />
            </div>

            <p className={`text-[10px] ${item.status === 'rejected' ? 'text-destructive' : item.status === 'approved' ? 'text-emerald-300' : 'text-muted-foreground'}`}>
              {statusNote(item)}
            </p>
          </div>
        );
      })}
    </section>
  );
}