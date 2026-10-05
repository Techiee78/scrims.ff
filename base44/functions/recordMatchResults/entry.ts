import { serviceClient, getUserFromToken } from '../../shared/supabase.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const user = await getUserFromToken(body.__supabase_token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Organizers only' }, { status: 403 });

    const tournamentId = body.tournament_id;
    const results = Array.isArray(body.results) ? body.results : [];
    if (!tournamentId) return Response.json({ error: 'Missing tournament' }, { status: 400 });
    if (!results.length) return Response.json({ error: 'No results to save' }, { status: 400 });

    const supa = serviceClient();

    const { data: regs } = await supa
      .from('registrations')
      .select('id, tournament_id, status')
      .eq('tournament_id', tournamentId)
      .eq('status', 'joined');
    const byId = new Map((regs || []).map((r: any) => [r.id, r]));

    const updates: Promise<any>[] = [];
    for (const entry of results) {
      const reg = byId.get(entry.registration_id);
      if (!reg) continue;
      const kills = Math.max(0, Math.floor(Number(entry.kills) || 0));
      const placement = Math.max(0, Math.floor(Number(entry.placement) || 0));
      updates.push(
        supa
          .from('registrations')
          .update({ kills, placement, played: placement > 0 })
          .eq('id', reg.id)
      );
    }
    await Promise.all(updates);

    return Response.json({ success: true, saved: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}