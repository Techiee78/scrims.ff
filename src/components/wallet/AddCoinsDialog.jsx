import { useState } from 'react';
import { Coins, Loader2, Lock, Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { withAuth } from '@/lib/authToken';
import { coins as formatCoins } from '@/lib/format';

// 1 coin = 1 INR
const PACKS = [
  { coins: 100, tag: 'Starter' },
  { coins: 500, tag: 'Popular' },
  { coins: 1500, tag: 'Best value' },
];

const inr = (coins) => `₹${coins.toLocaleString('en-IN')}`;

export default function AddCoinsDialog({ open, onClose, onSuccess }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!open) return null;

  const startPayment = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const orderRes = await base44.functions.invoke('createCoinOrder', await withAuth({ coins: selected }));
      const order = orderRes?.data ?? orderRes;

      if (order?.configured === false) {
        toast({
          title: 'Payments coming soon',
          description: 'Razorpay keys are not configured yet. Coin top-ups will be live shortly.',
        });
        return;
      }
      if (!order?.orderId) {
        throw new Error(order?.error || 'Could not start payment');
      }

      if (typeof window === 'undefined' || !window.Razorpay) {
        toast({
          title: 'Checkout unavailable',
          description: 'Razorpay script failed to load. Check your connection and retry.',
          variant: 'destructive',
        });
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Scrims.ff',
        description: `${formatCoins(order.coins)} coins`,
        order_id: order.orderId,
        prefill: {
          email: user?.email || '',
          name: user?.full_name || '',
        },
        theme: { color: '#1f6fe8' },
        handler: async (response) => {
          try {
            const verifyRes = await base44.functions.invoke('verifyCoinPayment', await withAuth({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }));
            const verify = verifyRes?.data ?? verifyRes;
            if (verify?.credited) {
              toast({
                title: 'Top-up successful',
                description: `${formatCoins(verify.coins)} coins added. New balance: ${formatCoins(verify.balance)}.`,
              });
              setSelected(null);
              onClose();
              onSuccess?.(verify);
            } else if (verify?.already) {
              toast({ title: 'Already credited', description: 'This payment was already applied.' });
            } else {
              throw new Error(verify?.error || 'Verification failed');
            }
          } catch (err) {
            toast({
              title: 'Verification failed',
              description: err.message || 'Please contact support if coins were debited.',
              variant: 'destructive',
            });
          }
        },
        modal: { ondismiss: () => {} },
      });

      rzp.on('payment.failed', (resp) => {
        toast({
          title: 'Payment failed',
          description: resp?.error?.description || 'No money was debited. Try again.',
          variant: 'destructive',
        });
      });

      rzp.open();
    } catch (err) {
      toast({
        title: 'Top-up failed',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-strong relative w-full max-w-md rounded-t-[30px] p-5 sm:rounded-[30px]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Add coins</h2>
            <p className="text-xs text-muted-foreground">1 coin = ₹1. Top up to join tournaments.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-soft flex h-8 w-8 items-center justify-center rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {PACKS.map((pack) => {
            const active = selected === pack.coins;
            return (
              <button
                key={pack.coins}
                type="button"
                onClick={() => setSelected(pack.coins)}
                className={`glass flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-colors ${
                  active ? 'border-primary/60 ring-1 ring-primary/60' : ''
                }`}
              >
                <span className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Coins className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatCoins(pack.coins)} coins</p>
                  <p className="text-[11px] text-muted-foreground">{pack.tag}</p>
                </div>
                <span className="font-display text-sm font-semibold">{inr(pack.coins)}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selected || loading}
          onClick={startPayment}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground shadow disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {selected ? `Pay ${inr(selected)} · ${formatCoins(selected)} coins` : 'Select a pack'}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          Secured by Razorpay. Coins are credited after payment verification.
        </p>
      </div>
    </div>
  );
}