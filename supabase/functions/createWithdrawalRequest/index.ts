import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';
import { WITHDRAW_MIN, WITHDRAW_MAX, UPI_ID_RE, mapWithdrawalError } from '../_shared/withdrawals.ts';

// Player asks to cash out coins to their own UPI ID.
// Only the amount and payout details come from the client — identity and the
// money are never trusted from the request, and nothing is debited here.
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const rate = await checkUserRateLimit(serviceClient(), user.id, 'withdrawal_request', 1800, 3);
    if (rate === false) return Response.json({ error: 'Too many withdrawal requests. Please wait and try again.' }, { status: 429 });
    if (rate === null) return Response.json({ error: 'Request protection is temporarily unavailable.' }, { status: 503 });

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const coins = Number(body?.coins);
    if (!Number.isInteger(coins) || coins < WITHDRAW_MIN || coins > WITHDRAW_MAX) {
      return Response.json(
        { error: `Enter a whole number between ${WITHDRAW_MIN} and ${WITHDRAW_MAX} coins.` },
        { status: 400 },
      );
    }

    const upi = String(body?.upi_id || '').trim();
    if (!UPI_ID_RE.test(upi)) {
      return Response.json(
        { error: 'Enter the UPI ID where you want to receive the money, for example yourname@okaxis.' },
        { status: 400 },
      );
    }

    const accountName = String(body?.account_name || '').trim();
    if (accountName.length < 2 || accountName.length > 60) {
      return Response.json({ error: 'Enter the name on your UPI account.' }, { status: 400 });
    }

    const { data, error } = await serviceClient().rpc('withdrawal_request_create', {
      p_user_id: user.id,
      p_coins: coins,
      p_payout_upi: upi,
      p_account_name: accountName,
      p_note: String(body?.note || '').slice(0, 140),
    });

    if (error) {
      const mapped = mapWithdrawalError(error.message);
      return Response.json({ error: mapped.error }, { status: mapped.status });
    }

    return Response.json({ request: data });
  } catch (_error: any) {
    return Response.json({ error: 'The withdrawal request could not be created.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));