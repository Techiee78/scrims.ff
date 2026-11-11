import { useState } from 'react';
import { CheckCircle2, Clock, FlaskConical, Loader2, Plus, Receipt, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { createTestRecharge, simulateTestRecharge } from '@/lib/testRecharge';
import { useToast } from '@/components/ui/use-toast';
import { coins as formatCoins } from '@/lib/format';

const PRESETS = [100, 500, 1500];
const MIN_COINS = 10;
const MAX_COINS = 10000;

const STATUS = {
  pending: { label: 'Pending', icon: Clock, tone: 'text-amber-300' },
  created: { label: 'Pending', icon: Clock, tone: 'text-amber-300' },
  paid: { label: 'Success', icon: CheckCircle2, tone: 'text-emerald-300' },
  failed: { label: 'Failed', icon: XCircle, tone: 'text-destructive' },
};

function StatusPill({ status }) {
  const meta = STATUS[status] || { label: status, icon: Clock, tone: 'text-muted-foreground' };
  const Icon = meta.icon;
  return (
    <span className="glass-soft flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
      <Icon className={`h-3 w-3 ${meta.tone}`} />
      {meta.label}
    </span>
  );
}

export default function TestRechargePanel({ topups = [], onChanged }) {
  const [amount, setAmount] = useState(PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [busy, setBusy] = useState('');
  const [blocked, setBlocked] = useState('');
  const { toast } = useToast();

  const customValue = Number(custom);
  const chosen = custom.trim() === '' ? amount : customValue;

  const testOrders = topups.filter((t) => t.mode === 'test');

  const createOrder = async () => {
    setBusy('create');
    try {
      const res = await createTestRecharge(chosen);
      const order = res?.order;
      if (!order?.orderId) throw new Error(res?.error || 'Could not create the test order.');
      setPendingOrder(order);
      setBlocked('');
      toast({
        title: 'Test order created',
        description: `${formatCoins(order.coins)} coins pending · ${order.orderId}`,
      });
      onChanged?.();
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Could not create the test order.';
      if (/limited|configured|production|switched off/i.test(message)) setBlocked(message);
      toast({ title: 'Test recharge unavailable', description: message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const settle = async (outcome) => {
    if (!pendingOrder?.orderId) return;
    setBusy(outcome);
    try {
      const res = await simulateTestRecharge(pendingOrder.orderId, outcome);
      if (outcome === 'success' && res?.credited) {
        toast({
          title: 'Test recharge successful',
          description: `${formatCoins(res.coins)} coins added. Balance: ${formatCoins(res.balance)}.`,
        });
      } else if (outcome === 'success' && res?.already) {
        toast({ title: 'Already credited', description: 'This test order was applied before.' });
      } else if (outcome === 'failure') {
        toast({ title: 'Test payment marked failed', description: 'No coins were added.' });
      }
      setPendingOrder(null);
      onChanged?.();
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Could not settle the test order.';
      if (/limited|configured|production|switched off/i.test(message)) setBlocked(message);
      toast({ title: 'Test recharge failed', description: message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const disabled = Boolean(blocked) || busy !== '' || !Number.isInteger(chosen) || chosen < MIN_COINS || chosen > MAX_COINS;

  return (
    <section className="glass space-y-3 rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="glass-soft flex h-8 w-8 items-center justify-center rounded-full">
            <FlaskConical className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold">Recharge wallet</h2>
            <p className="text-[10px] text-muted-foreground">Simulated credits for testing</p>
          </div>
        </div>
        <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200">
          Test mode
        </span>
      </div>

      <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
        No real payment happens here — no UPI QR, no PIN, no bank transfer. Test coins are simulated
        credits for trying tournaments and are labelled as test recharges in your history.
      </p>

      {blocked && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
          {blocked}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((value) => {
          const active = custom.trim() === '' && amount === value;
          return (
            <button
              key={value}
              type="button"
              disabled={Boolean(blocked)}
              onClick={() => {
                setAmount(value);
                setCustom('');
              }}
              className={`glass-soft rounded-2xl px-2 py-2.5 text-center transition-colors disabled:opacity-50 ${
                active ? 'border-primary/60 ring-1 ring-primary/60' : ''
              }`}
            >
              <span className="block font-display text-sm font-semibold">{formatCoins(value)}</span>
              <span className="block text-[10px] text-muted-foreground">coins</span>
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Custom amount ({MIN_COINS}–{MAX_COINS})
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_COINS}
          max={MAX_COINS}
          step={1}
          value={custom}
          disabled={Boolean(blocked)}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. 250"
          className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60 disabled:opacity-50"
        />
      </label>

      {custom.trim() !== '' && (!Number.isInteger(customValue) || customValue < MIN_COINS || customValue > MAX_COINS) && (
        <p className="text-[10px] text-destructive">
          Enter a whole number between {MIN_COINS} and {MAX_COINS} coins.
        </p>
      )}

      <button
        type="button"
        onClick={createOrder}
        disabled={disabled}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-40"
      >
        {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create test order · {formatCoins(Number.isFinite(chosen) ? chosen : 0)} coins
      </button>

      {pendingOrder && (
        <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/[0.06] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Order ID</span>
            <StatusPill status={pendingOrder.status || 'pending'} />
          </div>
          <p className="break-all font-mono text-[10px] text-foreground/80">{pendingOrder.orderId}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => settle('success')}
              disabled={busy !== ''}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy === 'success' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Simulate success
            </button>
            <button
              type="button"
              onClick={() => settle('failure')}
              disabled={busy !== ''}
              className="glass-soft flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[11px] font-medium text-muted-foreground disabled:opacity-40"
            >
              {busy === 'failure' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Simulate failure
            </button>
          </div>
        </div>
      )}

      {testOrders.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Receipt className="h-3 w-3" />
            Recent test orders
          </div>
          {testOrders.slice(0, 5).map((order) => (
            <div key={order.id} className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[10px] text-foreground/80">{order.order_id}</p>
                <p className="text-[10px] text-muted-foreground">
                  {order.created_at ? format(new Date(order.created_at), 'd MMM · h:mm a') : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xs font-semibold">{formatCoins(order.coins)}</p>
                <StatusPill status={order.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}