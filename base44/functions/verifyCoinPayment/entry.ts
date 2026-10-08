import { getUserFromRequest } from '../../shared/supabase.ts';
import { serviceClient } from '../../shared/supabase.ts';
import { secrets } from 'base44:runtime';
import { creditCoins } from '../../shared/wallet.ts';

// Verifies a Cashfree payment for a coin top-up and credits the wallet.
// Looks up the order via Cashfree PG API and credits only when status is PAID.
// Returns { credited: true, coins, balance } on success.
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
    if (!orderId) {
      return Response.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const appId = secrets.get('CASHFREE_APP_ID');
    const secretKey = secrets.get('CASHFREE_SECRET_KEY');
    const env = (secrets.get('CASHFREE_ENV') || 'PROD').toUpperCase();
    if (!appId || !secretKey) {
      return Response.json({ error: 'Payments are not configured.' }, { status: 503 });
    }

    const baseUrl = env === 'TEST' ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com';
    const apiVersion = '2023-08-01';

    const res = await fetch(`${baseUrl}/pg/orders/${encodeURIComponent(orderId)}/payments`, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': apiVersion,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: 'Cashfree verification failed', details: errText }, { status: 502 });
    }
    const data = await res.json();
    // Cashfree returns an array of payment attempts; the most recent is first.
    const payment = Array.isArray(data) ? data[0] : data;
    if (!payment || payment.payment_status !== 'SUCCESS') {
      return Response.json({ error: 'Payment not successful', status: payment?.payment_status || 'unknown' }, { status: 400 });
    }

    const supa = serviceClient();
    const { data: topup } = await supa
      .from('coin_topups')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_email', user.email)
      .maybeSingle();

    if (!topup) {
      return Response.json({ error: 'Order not found for this user' }, { status: 404 });
    }
    if (topup.status === 'paid') {
      return Response.json({ credited: false, already: true, coins: topup.coins });
    }

    await supa
      .from('coin_topups')
      .update({ status: 'paid', payment_id: payment.cf_payment_id || payment.order_id })
      .eq('order_id', orderId);

    const wallet = await creditCoins(supa, user.email, topup.coins, `Coin top-up · ${topup.coins} coins`);

    return Response.json({ credited: true, coins: topup.coins, balance: wallet.balance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}