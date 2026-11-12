import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { COINS_MIN, COINS_MAX, REFERENCE_RE, normalizeReference, loadUpiSettings, mapDepositError } from '../_shared/deposits.ts';

// Player submits "I have paid" with the UPI reference from their payment.
// Only the reference/amount come from the client: identity and the money are
// never trusted from the request, and nothing is credited here.
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

    const reference = normalizeReference(body?.reference);
    if (!REFERENCE_RE.test(reference)) {
      return Response.json(
        { error: 'Enter the 12-digit UTR from your payment app.' },
        { status: 400 },
      );
    }

    const note = String(body?.note || '').slice(0, 140);
    const supa = serviceClient();

    const settings = await loadUpiSettings(supa);
    if (!settings.active) {
      return Response.json(
        { error: 'Coin payments are not set up yet. Please try again later.' },
        { status: 503 },
      );
    }

    const { data, error } = await supa.rpc('deposit_request_create', {
      p_user_id: user.id,
      p_coins: coins,
      p_reference: reference,
      p_note: note,
    });

    if (error) {
      const mapped = mapDepositError(error.message);
      return Response.json({ error: mapped.error }, { status: mapped.status });
    }

    return Response.json({ request: data });
  } catch (_error: any) {
    return Response.json({ error: 'The deposit request could not be created.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));