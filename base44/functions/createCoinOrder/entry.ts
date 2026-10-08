import { getUserFromRequest } from '../../shared/supabase.ts';
import { serviceClient } from '../../shared/supabase.ts';
import { secrets } from 'base44:runtime';

// Creates a Cashfree order for a coin top-up.
// 1 coin = 1 INR. Returns { configured: false } when Cashfree keys are absent
// so the UI can inform the user without erroring.
//
// Cashfree PG API: https://api.cashfree.com/pg/orders (PROD) / https://sandbox.cashfree.com/pg/orders (TEST)
export default async function (req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appId = secrets.get('CASHFREE_APP_ID');
    const secretKey = secrets.get('CASHFREE_SECRET_KEY');
    const env = (secrets.get('CASHFREE_ENV') || 'PROD').toUpperCase();
    if (!appId || !secretKey) {
      return Response.json({ configured: false, message: 'Payments are not configured yet.' });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const coins = Number(body?.coins);
    if (!Number.isInteger(coins) || coins <= 0) {
      return Response.json({ error: 'Invalid coin amount' }, { status: 400 });
    }

    // Send the player back to the app's own Wallet page after checkout
    // (the function's own host is not the app, so use the caller's origin).
    const returnOrigin =
      typeof body?.returnOrigin === 'string' && /^https?:\/\/[^/\s]+$/.test(body.returnOrigin)
        ? body.returnOrigin
        : 'https://scrim-fire-hub.base44.app';

    const amountInr = coins.toFixed(2); // Cashfree expects a string amount
    const orderId = `coins_${user.id}_${Date.now()}`;
    const baseUrl = env === 'TEST' ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com';
    const apiVersion = '2023-08-01';

    // Save the pending top-up first — never open checkout without a record.
    const supa = serviceClient();
    const { error: saveError } = await supa.from('coin_topups').insert({
      user_email: user.email,
      coins,
      amount_inr: coins,
      order_id: orderId,
      status: 'created',
    });
    if (saveError) {
      return Response.json({ error: 'Top-ups are temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    const res = await fetch(`${baseUrl}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': apiVersion,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amountInr),
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id,
          customer_email: user.email,
          customer_phone: '9999999999',
          customer_name: user.full_name || user.email,
        },
        order_meta: {
          return_url: `${returnOrigin}/wallet?order_id=${orderId}`,
        },
        order_note: `${coins} coins top-up · Scrims.ff`,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: 'Cashfree order failed', details: errText }, { status: 502 });
    }
    const order = await res.json();

    return Response.json({
      configured: true,
      orderId,
      paymentSessionId: order.payment_session_id,
      amount: Number(amountInr),
      currency: 'INR',
      env,
      appId,
      coins,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}