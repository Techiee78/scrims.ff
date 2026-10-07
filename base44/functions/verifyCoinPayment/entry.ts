import { getUserFromRequest } from '../../shared/supabase.ts';
import { serviceClient } from '../../shared/supabase.ts';
import { secrets } from 'base44:runtime';
import { creditCoins } from '../../shared/wallet.ts';

// Verifies a Razorpay payment for a coin top-up and credits the wallet.
// Razorpay signature = HMAC_SHA256(order_id|payment_id, key_secret).
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: 'Missing payment fields' }, { status: 400 });
    }

    const keySecret = secrets.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return Response.json({ error: 'Payments are not configured.' }, { status: 503 });
    }

    // Verify signature using Web Crypto (SubtleCrypto).
    const enc = new TextEncoder();
    const keyData = enc.encode(keySecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const message = enc.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
    const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, message);
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (expected !== razorpay_signature) {
      return Response.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const supa = serviceClient();
    const { data: topup } = await supa
      .from('coin_topups')
      .select('*')
      .eq('order_id', razorpay_order_id)
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
      .update({ status: 'paid', payment_id: razorpay_payment_id })
      .eq('order_id', razorpay_order_id);

    const wallet = await creditCoins(supa, user.email, topup.coins, `Coin top-up · ${topup.coins} coins`);

    return Response.json({ credited: true, coins: topup.coins, balance: wallet.balance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}