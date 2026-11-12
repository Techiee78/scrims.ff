import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { WITHDRAW_MIN, WITHDRAW_MAX } from '../_shared/withdrawals.ts';

// The signed-in player's own withdrawal requests, each with the admin decision
// (if any), plus how many coins can still be requested right now.
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supa = serviceClient();

    const { data: requests, error } = await supa
      .from('withdrawal_requests')
      .select('id, coins, payout_upi, account_name, player_note, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const ids = (requests || []).map((r: any) => r.id);
    let decisions: any[] = [];
    if (ids.length > 0) {
      const { data } = await supa
        .from('withdrawal_decisions')
        .select('request_id, action, reason, admin_email, coins, payout_ref, balance_after, created_at')
        .in('request_id', ids);
      decisions = data || [];
    }

    const byRequest: Record<string, any> = {};
    for (const d of decisions) byRequest[d.request_id] = d;

    const { data: wallet } = await supa
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    const balance = Number(wallet?.balance || 0);
    const pending = (requests || [])
      .filter((r: any) => r.status === 'pending')
      .reduce((sum: number, r: any) => sum + Number(r.coins || 0), 0);

    return Response.json({
      requests: (requests || []).map((r: any) => ({
        ...r,
        decision: byRequest[r.id] || null,
      })),
      balance,
      available: Math.max(0, balance - pending),
      min: WITHDRAW_MIN,
      max: WITHDRAW_MAX,
    });
  } catch (_error: any) {
    return Response.json({ error: 'Could not load your withdrawal requests.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));