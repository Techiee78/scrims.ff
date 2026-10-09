import { getUserFromRequest } from '../../shared/supabase.ts';
import { serviceClient } from '../../shared/supabase.ts';
import { secrets } from 'base44:runtime';
import { creditCoins } from '../../shared/wallet.ts';

// Verifies a Cashfree coin top-up and credits the wallet exactly once.
// Cashfree's order is the source of truth (owner, amount, PAID status), so a
// paid order is credited even if its pending record was never saved.
// Returns { credited, already, status } where status mirrors Cashfree's
// order_status (PAID, ACTIVE, FAILED, EXPIRED, ...).
export default async function (req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { orderId } = body || {};
    if (!orderId || typeof orderId !== 'string') {
      return Response.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const appId = secrets.get('CASHFREE_APP_ID');
    const secretKey = secrets.get('CASHFREE_SECRET_KEY');
    const env = (secrets.get('CASHFREE_ENV') || 'PROD').toUpperCase();
    if (!appId || !secretKey) {
      return Response.json({ error: 'Payments are not configured.' }, { status: 503 });
    }
    const baseUrl = env === 'TEST' ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com';

    const res = await fetch(`${baseUrl}/pg/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      return Response.json({ error: 'Could not reach Cashfree to verify. Try again.' }, { status: 502 });
    }
    const order = await res.json();

    if (order?.customer_details?.customer_id !== user.id) {
      return Response.json({ error: 'Order not found for this user' }, { status: 404 });
    }
    const status = String(order?.order_status || 'UNKNOWN').toUpperCase();
    const coins = Math.round(Number(order.order_amount)); // 1 coin = 1 INR
    const paymentRef = String(order.cf_order_id || orderId);
    const supa = serviceClient();

    if (status !== 'PAID') {
      // Reflect failed/active orders on the record so the status is visible.
      if (status === 'FAILED' || status === 'EXPIRED') {
        await supa
          .from('coin_topups')
          .update({ status: 'failed', payment_id: paymentRef })
          .eq('order_id', orderId)
          .neq('status', 'paid');
      }
      return Response.json({ credited: false, status });
    }

    // Claim the order atomically so it is credited only once.
    const { data: claimed, error: claimError } = await supa
      .from('coin_topups')
      .update({ status: 'paid', payment_id: paymentRef, coins, amount_inr: coins })
      .eq('order_id', orderId)
      .neq('status', 'paid')
      .select();
    if (claimError) throw new Error(claimError.message);

    if (!claimed?.length) {
      const { error: insertError } = await supa.from('coin_topups').insert({
        user_email: user.email,
        coins,
        amount_inr: coins,
        order_id: orderId,
        payment_id: paymentRef,
        status: 'paid',
      });
      if (insertError) {
        if (insertError.code === '23505') {
          return Response.json({ credited: false, already: true, coins, status: 'PAID' });
        }
        throw new Error(insertError.message);
      }
    }

    const wallet = await creditCoins(supa, user.email, coins, `Coin top-up · ${coins} coins`);
    return Response.json({ credited: true, coins, balance: wallet.balance, status: 'PAID' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}