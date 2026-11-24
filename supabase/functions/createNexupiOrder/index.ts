import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';
import { COINS_MIN, COINS_MAX, dailyLimitError } from '../_shared/deposits.ts';
import {
  createProviderOrder,
  generateOrderId,
  loadNexupiSettings,
  loadPaymentMode,
  settleOrder,
} from '../_shared/nexupi.ts';

// Where the hosted payment page sends the player once it is done. Only a plain
// http(s) address is accepted so the gateway link can never be hijacked.
function safeReturnUrl(raw: unknown): string {
  const value = String(raw ?? '').trim();
  return /^https?:\/\/[^\s"'<>]{4,300}$/.test(value) ? value : '';
}

// Automatic mode: the player asks for coins and gets a NexUPI payment page.
// Coins are never credited here — only the status check / webhook does that.
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const coins = Number(body?.coins);
    if (!Number.isInteger(coins) || coins < COINS_MIN || coins > COINS_MAX) {
      return Response.json(
        { error: `Enter a whole number between ${COINS_MIN} and ${COINS_MAX} coins.` },
        { status: 400 },
      );
    }

    const supa = serviceClient();

    const mode = await loadPaymentMode(supa);
    if (mode !== 'automatic') {
      return Response.json(
        { error: 'Instant UPI payments are turned off. Use the manual payment option.' },
        { status: 409 },
      );
    }

    const settings = await loadNexupiSettings(supa);
    if (!settings.ready) {
      return Response.json(
        { error: 'Instant UPI payments are not set up yet. Please try again later.' },
        { status: 503 },
      );
    }

    const limit = await dailyLimitError(supa, user.id, coins);
    if (limit) return Response.json({ error: limit.error }, { status: limit.status });

    const orderId = generateOrderId();

    const { error: createError } = await supa.rpc('deposit_order_create', {
      p_user_id: user.id,
      p_coins: coins,
      p_order_id: orderId,
    });

    if (createError) {
      const message = String(createError.message || '');
      if (message.includes('too_many_pending')) {
        return Response.json(
          { error: 'You already have 5 payments waiting. Finish or wait for them to expire.' },
          { status: 429 },
        );
      }
      if (message.includes('invalid_amount')) {
        return Response.json(
          { error: `Enter a whole number between ${COINS_MIN} and ${COINS_MAX} coins.` },
          { status: 400 },
        );
      }
      return Response.json({ error: 'The order could not be created.' }, { status: 500 });
    }

    try {
      const paymentUrl = await createProviderOrder(
        settings,
        orderId,
        coins,
        safeReturnUrl(body?.return_url)
      );
      return Response.json({ orderId, coins, paymentUrl });
    } catch (_e) {
      await settleOrder(supa, orderId, 'failure', 'The UPI gateway did not return a payment page.');
      return Response.json(
        { error: 'The UPI gateway is not responding. Please try again.' },
        { status: 502 },
      );
    }
  } catch (_error: any) {
    return Response.json({ error: 'The payment could not be started.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));