import { requireAdmin, serviceClient } from '../_shared/supabase.ts';
import { slotCapacity } from '../_shared/slots.ts';

// Every tournament change by an admin leaves a trail in admin_audit_log.
async function logAdminAction(
  supa: any,
  user: { id: string; email: string },
  action: string,
  details: Record<string, any>
) {
  try {
    await supa.from('admin_audit_log').insert({
      actor_id: user.id,
      actor_email: user.email,
      action,
      entity: 'tournament',
      details,
    });
  } catch (_e) {
    // Logging must never block the admin action itself.
  }
}

export default async function handler(req: Request): Promise<Response> {
  try {
    // Every action here creates, edits or deletes a tournament, so the second
    // factor is required once the admin has one enrolled.
    const guard = await requireAdmin(req, { requireMfa: true });
    if (!guard.ok) return guard.response;
    const user = guard.value.admin;

    const body = await req.json();
    const action = body.action;
    if (!['create', 'update', 'delete'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supa = serviceClient();

    if (action === 'delete') {
      const id = body.tournament_id;
      if (!id) return Response.json({ error: 'Missing tournament' }, { status: 400 });
      const { error } = await supa.from('tournaments').delete().eq('id', id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      await logAdminAction(supa, user, 'tournament.delete', { tournament_id: id });
      return Response.json({ success: true });
    }

    const data = body.data || {};
    if (!data.title || !data.mode) {
      return Response.json({ error: 'Title and mode are required' }, { status: 400 });
    }

    const payload: Record<string, any> = {
      title: String(data.title).trim(),
      mode: data.mode === 'CS' ? 'CS' : 'Full Map',
      team_type: ['Solo', 'Duo', 'Squad'].includes(data.team_type) ? data.team_type : 'Solo',
      entry_fee: Math.max(0, Number(data.entry_fee) || 0),
      prize_pool: Math.max(0, Number(data.prize_pool) || 0),
      prize_1st: Math.max(0, Number(data.prize_1st) || 0),
      prize_2nd: Math.max(0, Number(data.prize_2nd) || 0),
      prize_3rd: Math.max(0, Number(data.prize_3rd) || 0),
      per_kill: Math.max(0, Number(data.per_kill) || 0),
      total_slots: Math.max(1, Number(data.total_slots) || slotCapacity(data.mode, data.team_type)),
      featured: !!data.featured,
      status: ['upcoming', 'live', 'completed'].includes(data.status) ? data.status : 'upcoming',
    };
    if (data.map !== undefined) payload.map = data.map ? String(data.map).trim() : null;
    if (data.match_time !== undefined) payload.match_time = data.match_time ? String(data.match_time) : null;
    if (data.banner_url !== undefined) payload.banner_url = data.banner_url ? String(data.banner_url) : null;
    if (data.room_id !== undefined) payload.room_id = data.room_id ? String(data.room_id) : null;
    if (data.room_password !== undefined) payload.room_password = data.room_password ? String(data.room_password) : null;

    // A pool with no split set keeps paying the whole amount to 1st place.
    if (payload.prize_1st + payload.prize_2nd + payload.prize_3rd === 0 && payload.prize_pool > 0) {
      payload.prize_1st = payload.prize_pool;
    }

    // legacy columns still present in the table — keep them in sync
    payload.max_slots = payload.total_slots;
    if (data.match_time !== undefined) payload.start_time = data.match_time || null;

    if (action === 'create') {
      const { data: created, error } = await supa.from('tournaments').insert(payload).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      await logAdminAction(supa, user, 'tournament.create', {
        tournament_id: created?.id,
        title: created?.title,
        mode: created?.mode,
        team_type: created?.team_type,
      });
      return Response.json({ success: true, tournament: created });
    }

    const id = body.tournament_id;
    if (!id) return Response.json({ error: 'Missing tournament' }, { status: 400 });
    const { data: updated, error } = await supa.from('tournaments').update(payload).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await logAdminAction(supa, user, 'tournament.update', {
      tournament_id: id,
      title: updated?.title,
      status: updated?.status,
      prize_pool: updated?.prize_pool,
      entry_fee: updated?.entry_fee,
    });
    return Response.json({ success: true, tournament: updated });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));