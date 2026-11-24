import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';
import { testModeGate, mapTopupError } from '../_shared/testMode.ts';

// TEST MODE ONLY — opens a simulated recharge order (no UPI, no payment
// gateway, no money moves). Identity comes from the verified access token;
// the client only supplies a whole coin amount.
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const rate = await checkUserRateLimit(serviceClient(), user.id, 'test_recharge_create', 600, 5);
    if (rate === false) return Response.json({ error: 'Too many test recharge attempts.' }, { status: 429 });
    if (rate === null) return Response.json({ error: 'Request protection is temporarily unavailable.' }, { status: 503 });

    const gate = testModeGate(user);
    if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const coins = Number(body?.coins);
    if (!Number.isInteger(coins)) {
      return Response.json({ error: 'Enter a whole number of coins.' }, { status: 400 });
    }

    const supa = serviceClient();
    const { data, error } = await supa.rpc('wallet_test_topup_create', {
      p_user_id: user.id,
      p_coins: coins,
    });

    if (error) {
      const mapped = mapTopupError(error.message);
      return Response.json({ error: mapped.error }, { status: mapped.status });
    }

    return Response.json({ enabled: true, testMode: true, order: data });
  } catch (error: any) {
    return Response.json({ error: 'The test recharge could not be started.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));