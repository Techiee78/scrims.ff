import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { coins as formatCoins } from '@/lib/format';
import { txnLabel } from '@/lib/txnLabel';
import { format } from 'date-fns';
import DepositStatusPill from '@/components/wallet/DepositStatusPill';

function when(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'd MMM yyyy · h:mm a');
}

function Row({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-medium">{value}</span>
    </div>
  );
}

export default function TransactionDetailDialog({ item, onOpenChange }) {
  const open = Boolean(item);
  const isDeposit = item?.kind === 'deposit';
  const isWithdrawal = item?.kind === 'withdrawal';
  const decision = item?.decision || null;

  const title = isDeposit ? 'Deposit' : isWithdrawal ? 'Withdrawal' : 'Transaction';
  const amount = isDeposit || isWithdrawal ? item?.coins : item?.amount;
  const credit = isDeposit ? true : isWithdrawal ? false : item?.type === 'credit';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(null)}>
      <DialogContent className="glass-strong max-h-[92vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-[26px] border-white/10 p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-base">{title}</DialogTitle>
          <DialogDescription className="text-[11px]">
            {when(item?.created_at || item?.created_date)}
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-3">
            <div className="glass-soft flex items-center justify-between rounded-[22px] px-4 py-3">
              <div>
                <p className="font-display text-lg font-semibold">
                  {credit ? '+' : '−'}
                  {formatCoins(amount)}
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">coins</p>
              </div>
              {(isDeposit || isWithdrawal) && <DepositStatusPill status={item.status} />}
            </div>

            <div className="glass-soft rounded-[22px] px-4 py-1">
              <Row label="Details" value={txnLabel(item)} />
              <Row label="Amount paid" value={isDeposit && item.amount_inr ? `₹${formatCoins(item.amount_inr)}` : null} />
              <Row label="UPI / UTR reference" value={isDeposit ? item.reference : null} />
              <Row label="Payout UPI" value={isWithdrawal ? item.payout_upi : null} />
              <Row label="Account name" value={isWithdrawal ? item.account_name : null} />
              <Row label="Payout reference" value={isWithdrawal && decision?.payout_ref ? decision.payout_ref : null} />
              <Row label="Your note" value={isDeposit ? item.payer_note : isWithdrawal ? item.player_note : null} />
              <Row label="Requested at" value={isDeposit || isWithdrawal ? when(item.created_at) : null} />
              <Row label="Updated at" value={item.updated_at ? when(item.updated_at) : null} />
              <Row
                label="Verified at"
                value={decision?.created_at ? when(decision.created_at) : null}
              />
              <Row
                label="Admin remark"
                value={decision?.reason || null}
              />
              <Row label="Balance after" value={item.balance_after !== undefined && item.balance_after !== null ? formatCoins(item.balance_after) : decision?.balance_after !== undefined && decision?.balance_after !== null ? formatCoins(decision.balance_after) : null} />
              <Row label="Reference ID" value={item.id ? String(item.id).slice(0, 8).toUpperCase() : null} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}