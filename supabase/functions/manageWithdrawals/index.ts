import { assertAdminMfa, requireAdmin, serviceClient } from '../_shared/supabase.ts';
import { mapWithdrawalError, normalizePayoutRef } from '../_shared/withdrawals.ts';

// Admin side of the coin withdrawals.
//   { action: 'list' }                                        -> queue + decided history
//   { action: 'approve', request_id, payout_ref?, reason? }   -> debits the wallet exactly once
//   { action: 'reject', request_id, reason }                  -> no balance change
//   { action: 'history' }                                     -> append-only admin audit log
export default async function handler(req: Request): Promise<Response> {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;
    const { admin, token } = guard.value;

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const supa = serviceClient();
    const action = body?.action || 'list';

    // Approving or rejecting moves coins out of a player's wallet.
    if (action !== 'list' && action !== 'history') {
      const mfa = await assertAdminMfa(admin.id, token);
      if (!mfa.ok) return mfa.response;
    }

    if (action === 'list') {
      const { data: pending, error: pendingError } = await supa
        .from('withdrawal_requests')
        .select('id, user_id, user_email, coins, payout_upi, account_name, player_note, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(200);
      if (pendingError) return Response.json({ error: pendingError.message }, { status: 500 });

      const { data: decided, error: decidedError } = await supa
        .from('withdrawal_requests')
        .select('id, user_id, user_email, coins, payout_upi, account_name, status, created_at')
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(40);
      if (decidedError) return Response.json({ error: decidedError.message }, { status: 500 });

      const decidedIds = (decided || []).map((r: any) => r.id);
      let decisions: any[] = [];
      if (decidedIds.length > 0) {
        const { data } = await supa
          .from('withdrawal_decisions')
          .select('request_id, action, reason, admin_email, balance_after, payout_ref, created_at')
          .in('request_id', decidedIds);
        decisions = data || [];
      }
      const decisionByRequest: Record<string, any> = {};
      for (const d of decisions) decisionByRequest[d.request_id] = d;

      const userIds = [...new Set([...(pending || []), ...(decided || [])].map((r: any) => r.user_id).filter(Boolean))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supa
          .from('profiles')
          .select('id, full_name, ff_ign, email')
          .in('id', userIds);
        profiles = data || [];
      }
      const profileById: Record<string, any> = {};
      for (const p of profiles) profileById[p.id] = p;

      const decorate = (r: any) => ({
        ...r,
        player: profileById[r.user_id] || null,
        decision: decisionByRequest[r.id] || null,
      });

      return Response.json({
        pending: (pending || []).map(decorate),
        decided: (decided || []).map(decorate),
      });
    }

    if (action === 'approve' || action === 'reject') {
      const requestId = String(body?.request_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
        return Response.json({ error: 'A valid request is required.' }, { status: 400 });
      }

      const { data, error } = await supa.rpc('withdrawal_request_decide', {
        p_admin_id: admin.id,
        p_request_id: requestId,
        p_action: action,
        p_reason: String(body?.reason || '').slice(0, 200),
        p_payout_ref: normalizePayoutRef(body?.payout_ref).slice(0, 64),
      });

      if (error) {
        const mapped = mapWithdrawalError(error.message);
        return Response.json({ error: mapped.error }, { status: mapped.status });
      }
      return Response.json({ result: data });
    }

    if (action === 'history') {
      const { data, error } = await supa
        .from('admin_audit_log')
        .select('id, actor_email, action, entity, entity_id, target_email, details, created_at')
        .like('action', 'withdrawal.%')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ entries: data || [] });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (_error: any) {
    return Response.json({ error: 'The request could not be completed.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));