import { getUserFromRequest, serviceClient } from '../../shared/supabase.ts';

// Admin-only: all joined registrations for a given match.
export default async function (req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json();
    const tournamentId = body.tournament_id;
    if (!tournamentId) return Response.json({ error: 'Missing tournament' }, { status: 400 });

    const supa = serviceClient();
    const { data, error } = await supa
      .from('registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'joined')
      .order('slot_number', { ascending: true })
      .limit(200);
    if (error) throw error;
    return Response.json({ registrations: data || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}