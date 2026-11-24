import { assertAdminMfa, requireAdmin, serviceClient } from '../_shared/supabase.ts';

// Admin-only: all joined registrations for a given match.
export default async function handler(req: Request): Promise<Response> {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;
    const { admin, token } = guard.value;
    const mfa = await assertAdminMfa(admin.id, token);
    if (!mfa.ok) return mfa.response;

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
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));