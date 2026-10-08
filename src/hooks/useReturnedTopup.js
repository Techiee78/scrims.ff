import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { verifyTopup } from '@/lib/verifyTopup';

// When Cashfree redirects back to /wallet?order_id=..., verify that order once,
// clean the URL, and call onDone so the wallet refreshes.
export default function useReturnedTopup(onDone) {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const handled = useRef(false);
  const orderId = params.get('order_id');

  useEffect(() => {
    if (!orderId || handled.current) return;
    handled.current = true;
    setParams({}, { replace: true });
    toast({ title: 'Confirming your payment…' });
    verifyTopup(orderId, toast).then((ok) => {
      if (ok) onDone?.();
    });
  }, [orderId, setParams, toast, onDone]);
}