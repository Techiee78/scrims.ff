import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { loadUpiSettings } from '../_shared/deposits.ts';
import { loadNexupiSettings, loadPaymentMode } from '../_shared/nexupi.ts';

// The signed-in player's own deposit requests, each with the admin decision
// (if any) so the status and reason are always visible in the app.
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supa = serviceClient();
    const settings = await loadUpiSettings(supa);
    const mode = await loadPaymentMode(supa);
    const nexupi = await loadNexupiSettings(supa);

    const { data: requests, error } = await supa
      .from('deposit_requests')
      .select('id, coins, amount_inr, reference, payer_note, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const ids = (requests || []).map((r: any) => r.id);
    let decisions: any[] = [];
    if (ids.length > 0) {
      const { data } = await supa
        .from('deposit_decisions')
        .select('request_id, action, reason, admin_email, coins, balance_after, wallet_txn_id, created_at')
        .in('request_id', ids);
      decisions = data || [];
    }

    const byRequest: Record<string, any> = {};
    for (const d of decisions) byRequest[d.request_id] = d;

    return Response.json({
      settings: {
        ...settings,
        mode,
        nexupiReady: nexupi.ready,
        paymentsLive: mode === 'automatic' ? nexupi.ready : settings.active,
      },
      requests: (requests || []).map((r: any) => ({
        ...r,
        decision: byRequest[r.id] || null,
      })),
    });
  } catch (_error: any) {
    return Response.json({ error: 'Could not load your deposit requests.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));