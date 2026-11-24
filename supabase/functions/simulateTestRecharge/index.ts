import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';
import { testModeGate, mapTopupError } from '../_shared/testMode.ts';

// TEST MODE ONLY — settles a simulated recharge order as success or failure.
// The wallet credit happens inside one database function that locks the order
// and wallet rows and is guarded by a unique ledger constraint, so a single
// order can be credited at most once even under concurrent/replayed requests.
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const rate = await checkUserRateLimit(serviceClient(), user.id, 'test_recharge_settle', 600, 8);
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

    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    const outcome = body?.outcome;
    if (!orderId) return Response.json({ error: 'Missing test order.' }, { status: 400 });
    if (outcome !== 'success' && outcome !== 'failure') {
      return Response.json({ error: 'Pick a test outcome.' }, { status: 400 });
    }

    const supa = serviceClient();
    const call =
      outcome === 'success'
        ? supa.rpc('wallet_test_topup_confirm', { p_user_id: user.id, p_order_id: orderId })
        : supa.rpc('wallet_test_topup_fail', { p_user_id: user.id, p_order_id: orderId });

    const { data, error } = await call;
    if (error) {
      const mapped = mapTopupError(error.message);
      return Response.json({ error: mapped.error }, { status: mapped.status });
    }

    return Response.json({ testMode: true, ...(data || {}) });
  } catch (error: any) {
    return Response.json({ error: 'The test recharge could not be completed.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));