import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowDownToLine, ArrowUpRight, ChevronRight, Plus } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';
import { format, isToday, isYesterday } from 'date-fns';
import DepositStatusPill from '@/components/wallet/DepositStatusPill';
import TransactionDetailDialog from '@/components/wallet/TransactionDetailDialog';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'winnings', label: 'Winnings' },
  { key: 'topup', label: 'Top-ups' },
  { key: 'withdraw', label: 'Withdrawals' },
  { key: 'debit', label: 'Entry fees' },
];

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return `Today · ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday · ${format(date, 'h:mm a')}`;
  return format(date, 'd MMM yyyy · h:mm a');
}

function category(item) {
  if (item.kind === 'deposit') return 'topup';
  if (item.kind === 'withdrawal') return 'withdraw';
  if (item.type === 'credit') return /top-?up/i.test(item.label || '') ? 'topup' : 'winnings';
  return /withdraw/i.test(item.label || '') ? 'withdraw' : 'debit';
}

function label(item) {
  if (item.kind === 'deposit') return 'Deposit request';
  if (item.kind === 'withdrawal') return 'Withdrawal request';
  if (item.label) return item.label;
  return item.type === 'credit' ? 'Tournament winnings' : 'Entry fee';
}

export default function TransactionHistory({ transactions = [], deposits = [], withdrawals = [] }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  // One single stream: wallet transactions plus deposit and withdrawal
  // requests. A request's own wallet entry is hidden, so an approved request
  // never shows twice.
  const items = useMemo(() => {
    const linked = new Set(
      [...deposits, ...withdrawals]
        .map((row) => row.decision?.wallet_txn_id)
        .filter(Boolean)
    );
    const refs = deposits
      .filter((row) => row.reference && row.status !== 'pending')
      .map((row) => String(row.reference));
    const rows = [
      ...transactions
        .filter((row) => !linked.has(row.id))
        .filter((row) => !refs.some((ref) => (row.label || '').includes(ref)))
        .map((row) => ({ ...row, at: row.created_date || row.created_at })),
      ...deposits.map((row) => ({ ...row, kind: 'deposit', at: row.created_at })),
      ...withdrawals.map((row) => ({ ...row, kind: 'withdrawal', at: row.created_at })),
    ];
    return rows.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  }, [transactions, deposits, withdrawals]);

  const counts = useMemo(() => {
    const base = { all: items.length, winnings: 0, topup: 0, withdraw: 0, debit: 0 };
    items.forEach((item) => {
      base[category(item)] += 1;
    });
    return base;
  }, [items]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => category(item) === filter)),
    [items, filter]
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-sm font-semibold">Transaction history</h2>
        <span className="text-[11px] text-muted-foreground">{counts.all} total</span>
      </div>

      <div className="glass-soft no-scrollbar flex gap-1.5 overflow-x-auto rounded-full p-1">
        {FILTERS.map((opt) => {
          const active = filter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
              <span className={active ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}>
                {counts[opt.key]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="glass rounded-[26px] px-6 py-8 text-center text-xs text-muted-foreground">
          {items.length === 0
            ? 'No transactions yet. Join a tournament to get started.'
            : 'Nothing in this filter yet.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => {
            const isRequest = item.kind === 'deposit' || item.kind === 'withdrawal';
            const isDeposit = item.kind === 'deposit';
            const isCredit = isRequest ? isDeposit : item.type === 'credit';
            const Icon = isRequest ? (isDeposit ? Plus : ArrowDownToLine) : isCredit ? ArrowDownLeft : ArrowUpRight;
            const amountClass = isRequest
              ? item.status === 'rejected'
                ? 'text-destructive line-through'
                : item.status === 'pending'
                  ? 'text-muted-foreground'
                  : isDeposit
                    ? 'text-emerald-300'
                    : 'text-accent'
              : isCredit && /top-?up/i.test(item.label || '')
                ? 'text-primary'
                : isCredit
                  ? 'text-accent'
                  : 'text-foreground';

            return (
              <button
                key={`${item.kind || 'tx'}-${item.id}`}
                type="button"
                onClick={() => setSelected(item)}
                className="glass flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-opacity active:opacity-70"
              >
                <span className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Icon className={isCredit ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-foreground'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{label(item)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{formatWhen(item.at)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-display text-sm font-semibold ${amountClass}`}>
                    {isCredit ? '+' : '−'}
                    {formatCoins(isRequest ? item.coins : item.amount)}
                  </p>
                  {isRequest ? (
                    <div className="mt-0.5 flex justify-end">
                      <DepositStatusPill status={item.status} />
                    </div>
                  ) : (
                    item.balance_after !== undefined && (
                      <p className="text-[10px] text-muted-foreground">Bal {formatCoins(item.balance_after)}</p>
                    )
                  )}
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      <TransactionDetailDialog item={selected} onOpenChange={setSelected} />
    </section>
  );
}