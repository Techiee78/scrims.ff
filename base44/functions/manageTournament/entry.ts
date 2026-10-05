import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { serviceClient } from '../../shared/supabase.ts';
import { slotCapacity } from '../../shared/slots.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json();
    const action = body.action;
    if (!['create', 'update', 'delete'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supa = serviceClient();

    if (action === 'delete') {
      const id = body.tournament_id;
      if (!id) return Response.json({ error: 'Missing tournament' }, { status: 400 });
      await supa.from('tournaments').delete().eq('id', id);
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

    if (action === 'create') {
      const { data: created } = await supa.from('tournaments').insert(payload).select().single();
      return Response.json({ success: true, tournament: created });
    }

    const id = body.tournament_id;
    if (!id) return Response.json({ error: 'Missing tournament' }, { status: 400 });
    const { data: updated } = await supa.from('tournaments').update(payload).eq('id', id).select().single();
    return Response.json({ success: true, tournament: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}