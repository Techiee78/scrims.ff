import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';
import { coins as formatCoins } from '@/lib/format';

// Verifies a Cashfree top-up order and shows a toast matching the payment status.
// Returns true when the coins are (or already were) credited.
export async function verifyTopup(orderId, toast) {
  try {
    const res = await callFunction('verifyCoinPayment', await withAuth({ orderId }));
    const data = res?.data ?? res;
    const status = String(data?.status || '').toUpperCase();

    if (data?.credited) {
      toast({
        title: 'Top-up successful',
        description: `${formatCoins(data.coins)} coins added. New balance: ${formatCoins(data.balance)}.`,
      });
      return true;
    }
    if (data?.already) {
      toast({ title: 'Already credited', description: 'This payment was already applied.' });
      return true;
    }

    // Non-paid outcomes — show the right status without debiting anything.
    if (status === 'ACTIVE') {
      toast({
        title: 'Payment pending',
        description: 'Your payment is still being processed. Coins are added once it succeeds.',
      });
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      toast({
        title: 'Payment failed',
        description: 'No money was debited. Please try the top-up again.',
        variant: 'destructive',
      });
    } else {
      throw new Error(data?.error || 'Verification failed');
    }
    return false;
  } catch (err) {
    toast({
      title: 'Verification failed',
      description:
        err?.response?.data?.error || err?.message || 'Please contact support if money was debited.',
      variant: 'destructive',
    });
    return false;
  }
}