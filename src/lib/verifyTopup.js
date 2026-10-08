import { base44 } from '@/api/base44Client';
import { withAuth } from '@/lib/authToken';
import { coins as formatCoins } from '@/lib/format';

// Verifies a Cashfree top-up order and shows the result toast.
// Returns true when the coins are (or already were) credited.
export async function verifyTopup(orderId, toast) {
  try {
    const res = await base44.functions.invoke('verifyCoinPayment', await withAuth({ orderId }));
    const data = res?.data ?? res;
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
    throw new Error(data?.error || 'Verification failed');
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