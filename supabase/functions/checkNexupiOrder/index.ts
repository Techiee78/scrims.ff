import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';
import {
  fetchProviderOrder,
  loadNexupiSettings,
  normalizeOrderId,
  settleOrder,
} from '../_shared/nexupi.ts';

// The player's "did my payment go through?" check. The order is always
// re-verified with NexUPI; whichever side arrives first (this poll or the
// webhook) credits the coins exactly once through deposit_order_settle.
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

    const orderId = normalizeOrderId(body?.order_id);
    if (orderId === '') {
      return Response.json({ error: 'A valid order is required.' }, { status: 400 });
    }

    const supa = serviceClient();

    const { data: order } = await supa
      .from('deposit_requests')
      .select('id, user_id, coins, status, created_at')
      .eq('provider_order_id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!order) {
      return Response.json({ error: 'That payment order was not found.' }, { status: 404 });
    }

    if (order.status === 'approved') {
      return Response.json({ status: 'approved', coins: order.coins, balance: null });
    }
    if (order.status === 'rejected') {
      return Response.json({ status: 'rejected', coins: order.coins, balance: null });
    }

    const settings = await loadNexupiSettings(supa);
    if (!settings.ready) {
      return Response.json({ status: 'pending', coins: order.coins, balance: null });
    }

    const result = await fetchProviderOrder(settings, orderId);

    if (result.state === 'paid') {
      const settled = await settleOrder(supa, orderId, 'success', `NexUPI order ${orderId}`);
      return Response.json({
        status: 'approved',
        coins: order.coins,
        balance: settled?.balance ?? null,
      });
    }

    if (result.state === 'failed') {
      await settleOrder(supa, orderId, 'failure', `NexUPI reported ${result.providerStatus || 'a failed payment'}.`);
      return Response.json({ status: 'rejected', coins: order.coins, balance: null });
    }

    // Abandoned orders expire at NexUPI after 30 minutes; closing them here
    // keeps them from filling the player's open-order limit.
    const ageMs = Date.now() - new Date(order.created_at).getTime();
    if (ageMs > 30 * 60 * 1000) {
      await settleOrder(supa, orderId, 'failure', 'The payment order expired before it completed.');
      return Response.json({ status: 'rejected', coins: order.coins, balance: null });
    }

    return Response.json({ status: 'pending', coins: order.coins, balance: null });
  } catch (_error: any) {
    return Response.json({ error: 'The payment status could not be checked.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));