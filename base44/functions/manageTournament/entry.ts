import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { slotCapacity } from '../../shared/slots.ts';

export default async function(req) {
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

    if (action === 'delete') {
      const id = body.tournament_id;
      if (!id) return Response.json({ error: 'Missing tournament' }, { status: 400 });
      await base44.asServiceRole.entities.Tournament.delete(id);
      return Response.json({ success: true });
    }

    const data = body.data || {};
    if (!data.title || !data.mode) {
      return Response.json({ error: 'Title and mode are required' }, { status: 400 });
    }

    const payload = {
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
    if (data.map) payload.map = String(data.map).trim();
    if (data.match_time) payload.match_time = String(data.match_time);
    if (data.banner_url) payload.banner_url = String(data.banner_url);
    if (data.room_id) payload.room_id = String(data.room_id);
    if (data.room_password) payload.room_password = String(data.room_password);

    if (action === 'create') {
      const created = await base44.asServiceRole.entities.Tournament.create(payload);
      return Response.json({ success: true, tournament: created });
    }

    const id = body.tournament_id;
    if (!id) return Response.json({ error: 'Missing tournament' }, { status: 400 });

    let existing = null;
    try {
      existing = await base44.asServiceRole.entities.Tournament.get(id);
    } catch (_notFound) {
      existing = null;
    }
    const updated = await base44.asServiceRole.entities.Tournament.update(id, payload);

    const roomPublished =
      payload.room_id && payload.room_password &&
      (!existing?.room_id || !existing?.room_password);

    let notified = 0;
    if (roomPublished) {
      const regs = await base44.asServiceRole.entities.Registration.filter({
        tournament_id: id,
        status: 'joined'
      });
      const emails = [...new Set((regs || []).map((r) => r.user_email).filter(Boolean))];
      for (const email of emails) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email });
          const u = users && users[0];
          if (!u) continue;
          await base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: u.id,
            title: 'Room details are out',
            content: 'Room ID & password for ' + (updated.title || 'your match') + ' are now in My Matches.',
            action_label: 'View match',
            action_url: 'https://scrim-fire-hub.base44.app/my-matches'
          });
          notified += 1;
        } catch (_pushError) {
          // a single failed send shouldn't block the others
        }
      }
    }

    return Response.json({ success: true, tournament: updated, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}