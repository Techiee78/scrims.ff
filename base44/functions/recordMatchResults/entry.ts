import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Organizers only' }, { status: 403 });

    const body = await req.json();
    const tournamentId = body.tournament_id;
    const results = Array.isArray(body.results) ? body.results : [];
    if (!tournamentId) return Response.json({ error: 'Missing tournament' }, { status: 400 });
    if (!results.length) return Response.json({ error: 'No results to save' }, { status: 400 });

    let tournament = null;
    try {
      tournament = await base44.asServiceRole.entities.Tournament.get(tournamentId);
    } catch (notFound) {
      tournament = null;
    }
    if (!tournament) return Response.json({ error: 'Match not found' }, { status: 404 });

    const registrations = await base44.asServiceRole.entities.Registration.filter({
      tournament_id: tournamentId,
      status: 'joined'
    });
    const byId = new Map(registrations.map((r) => [r.id, r]));

    const updates = [];
    for (const entry of results) {
      const reg = byId.get(entry.registration_id);
      if (!reg) continue;
      const kills = Math.max(0, Math.floor(Number(entry.kills) || 0));
      const placement = Math.max(0, Math.floor(Number(entry.placement) || 0));
      updates.push(
        base44.asServiceRole.entities.Registration.update(reg.id, {
          kills,
          placement,
          played: placement > 0
        })
      );
    }
    await Promise.all(updates);

    return Response.json({ success: true, saved: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}