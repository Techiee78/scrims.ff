import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { adminDecideDeposit, adminFetchAudit, adminFetchDeposits } from '@/lib/deposits';
import PaymentModeSwitch from '@/components/admin/PaymentModeSwitch';
import PaymentSetupTabs from '@/components/admin/PaymentSetupTabs';
import DepositRequestCard from '@/components/admin/DepositRequestCard';
import AuditTrail from '@/components/admin/AuditTrail';
import { useToast } from '@/components/ui/use-toast';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'decided', label: 'Decided' },
  { key: 'audit', label: 'Audit log' },
];

export default function AdminRequests() {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, log] = await Promise.all([adminFetchDeposits(), adminFetchAudit()]);
      setData(list);
      setAudit(log?.entries || []);
    } catch (err) {
      setError(err.message || 'Could not load the deposit queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (requestId, action, reason) => {
    const previous = data;
    const request = (data?.pending || []).find((item) => item.id === requestId);

    // Optimistic: the card moves to Decided with its new pill at once.
    if (request) {
      setData({
        ...data,
        pending: (data.pending || []).filter((item) => item.id !== requestId),
        decided: [
          {
            ...request,
            status: action === 'approve' ? 'approved' : 'rejected',
            decision: { reason, created_at: new Date().toISOString() },
          },
          ...(data.decided || []),
        ],
      });
    }

    try {
      const result = await adminDecideDeposit(requestId, action, reason);
      toast({
        title: action === 'approve' ? 'Payment approved' : 'Request rejected',
        description:
          action === 'approve'
            ? `${result?.coins} coins credited · new balance ${result?.balance}`
            : 'No coins were credited.',
      });
      await load();
    } catch (err) {
      // Put the request back in the queue and say what happened.
      setData(previous);
      toast({
        title: 'Decision not saved',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const pending = data?.pending || [];
  const decided = data?.decided || [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-semibold">Deposit requests</h1>
          <p className="text-sm text-muted-foreground">
            Verify each UPI payment in your bank account, then approve or reject it.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="glass-soft flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <PaymentModeSwitch
        mode={data?.settings?.mode}
        nexupiReady={Boolean(data?.settings?.nexupiReady)}
        onSaved={load}
      />

      <PaymentSetupTabs
        settings={data?.settings}
        nexupi={data?.nexupi}
        webhookUrl={data?.webhookUrl}
        onSaved={load}
      />

      {error && <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="glass-soft no-scrollbar flex gap-1.5 overflow-x-auto rounded-full p-1">
        {TABS.map((opt) => {
          const active = tab === opt.key;
          const count = opt.key === 'pending' ? pending.length : opt.key === 'decided' ? decided.length : audit.length;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTab(opt.key)}
              className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors ${
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
            No payments waiting for review.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pending.map((request) => (
              <DepositRequestCard key={request.id} request={request} onDecide={decide} />
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
              <DepositRequestCard key={request.id} request={request} onDecide={decide} />
            ))}
          </div>
        )
      ) : (
        <AuditTrail entries={audit} />
      )}
    </div>
  );
}