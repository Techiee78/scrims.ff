import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { adminDecideWithdrawal, adminFetchWithdrawalAudit, adminFetchWithdrawals } from '@/lib/withdrawals';
import { coins as formatCoins } from '@/lib/format';
import WithdrawalRequestCard from '@/components/admin/WithdrawalRequestCard';
import AuditTrail from '@/components/admin/AuditTrail';
import { useToast } from '@/components/ui/use-toast';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'decided', label: 'Decided' },
  { key: 'audit', label: 'Audit log' },
];

export default function AdminWithdrawals() {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, log] = await Promise.all([adminFetchWithdrawals(), adminFetchWithdrawalAudit()]);
      setData(list);
      setAudit(log?.entries || []);
    } catch (err) {
      setError(err.message || 'Could not load the withdrawal queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (requestId, action, { reason, payoutRef }) => {
    const result = await adminDecideWithdrawal(requestId, action, { reason, payoutRef });
    const outcome = result?.result || {};
    toast({
      title: action === 'approve' ? 'Withdrawal approved' : 'Request rejected',
      description:
        action === 'approve'
          ? `${formatCoins(outcome.coins)} coins deducted · new balance ${formatCoins(outcome.balance)}`
          : 'No coins were deducted.',
    });
    await load();
  };

  const pending = data?.pending || [];
  const decided = data?.decided || [];
  const pendingTotal = pending.reduce((sum, r) => sum + Number(r.coins || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-semibold">Withdrawals</h1>
          <p className="text-[11px] text-muted-foreground">
            Send the UPI payout yourself, then approve. Coins are deducted on approval only.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="glass-soft flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="glass flex items-center justify-between rounded-[22px] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">To pay out</p>
          <p className="font-display text-sm font-semibold">
            {pending.length} request{pending.length === 1 ? '' : 's'} · {formatCoins(pendingTotal)} coins
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">₹{formatCoins(pendingTotal)}</span>
      </div>

      {error && <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{error}</div>}

      <div className="glass-soft no-scrollbar flex gap-1.5 overflow-x-auto rounded-full p-1">
        {TABS.map((opt) => {
          const active = tab === opt.key;
          const count = opt.key === 'pending' ? pending.length : opt.key === 'decided' ? decided.length : audit.length;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTab(opt.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
              <span className={active ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="glass rounded-[24px] px-5 py-8 text-center text-xs text-muted-foreground">
            No withdrawals waiting for payout.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pending.map((request) => (
              <WithdrawalRequestCard key={request.id} request={request} onDecide={decide} />
            ))}
          </div>
        )
      ) : tab === 'decided' ? (
        decided.length === 0 ? (
          <div className="glass rounded-[24px] px-5 py-8 text-center text-xs text-muted-foreground">
            No decisions yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {decided.map((request) => (
              <WithdrawalRequestCard key={request.id} request={request} onDecide={decide} />
            ))}
          </div>
        )
      ) : (
        <AuditTrail entries={audit} />
      )}
    </div>
  );
}