import { getUserFromRequest } from '../../shared/supabase.ts';
import { serviceClient } from '../../shared/supabase.ts';
import { secrets } from 'base44:runtime';

// Creates a Razorpay order for a coin top-up.
// 1 coin = 1 INR. Returns { configured: false } when Razorpay keys are absent
// so the UI can inform the user without erroring.
export default async function (req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const keyId = secrets.get('RAZORPAY_KEY_ID');
    const keySecret = secrets.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
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

    const amountPaise = Math.round(coins) * 100; // 1 INR = 100 paise
    const receipt = `coins_${user.id}_${Date.now()}`;

    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          user_id: user.id,
          user_email: user.email,
          coins: String(coins),
          source: 'scrims_ff_topup',
        },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: 'Razorpay order failed', details: errText }, { status: 502 });
    }
    const order = await res.json();

    // Persist a pending top-up record so verify is idempotent and auditable.
    const supa = serviceClient();
    await supa.from('coin_topups').insert({
      user_email: user.email,
      coins,
      amount_inr: coins,
      order_id: order.id,
      status: 'created',
    });

    return Response.json({
      configured: true,
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId,
      coins,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}