import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';
import { format, isToday, isYesterday } from 'date-fns';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'winnings', label: 'Winnings' },
  { key: 'topup', label: 'Top-ups' },
  { key: 'debit', label: 'Entry fees' },
];

function isTopup(item) {
  return item.type === 'credit' && /top-?up/i.test(item.label || '');
}

function formatLabel(item) {
  if (item.label) return item.label;
  return item.type === 'credit' ? 'Tournament winnings' : 'Entry fee';
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return `Today · ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday · ${format(date, 'h:mm a')}`;
  return format(date, 'd MMM yyyy · h:mm a');
}

export default function TransactionHistory({ transactions = [] }) {
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => ({
    all: transactions.length,
    winnings: transactions.filter((t) => t.type === 'credit' && !isTopup(t)).length,
    topup: transactions.filter((t) => isTopup(t)).length,
    debit: transactions.filter((t) => t.type === 'debit').length,
  }), [transactions]);

  const visible = useMemo(() => {
    if (filter === 'all') return transactions;
    if (filter === 'winnings') return transactions.filter((t) => t.type === 'credit' && !isTopup(t));
    if (filter === 'topup') return transactions.filter((t) => isTopup(t));
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

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
          {transactions.length === 0
            ? 'No transactions yet. Join a tournament to get started.'
            : 'Nothing in this filter yet.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => {
            const topup = isTopup(item);
            const isCredit = item.type === 'credit';
            const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
            const when = formatWhen(item.created_date || item.created_at);
            return (
              <div key={item.id} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3">
                <span className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Icon className={topup ? 'h-4 w-4 text-primary' : isCredit ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-primary'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{formatLabel(item)}</p>
                  {when && <p className="text-[11px] text-muted-foreground">{when}</p>}
                </div>
                <div className="text-right">
                  <p
                    className={
                      topup
                        ? 'font-display text-sm font-semibold text-primary'
                        : isCredit
                          ? 'font-display text-sm font-semibold text-accent'
                          : 'font-display text-sm font-semibold text-foreground'
                    }
                  >
                    {isCredit ? '+' : '−'}
                    {formatCoins(item.amount)}
                  </p>
                  {item.balance_after !== undefined && (
                    <p className="text-[10px] text-muted-foreground">Bal {formatCoins(item.balance_after)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}