import { assertAdminMfa, requireAdmin, serviceClient } from '../_shared/supabase.ts';

// Admin-only dashboard stats.
export default async function handler(req: Request): Promise<Response> {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;
    const { admin, token } = guard.value;
    const mfa = await assertAdminMfa(admin.id, token);
    if (!mfa.ok) return mfa.response;

    const supa = serviceClient();
    const { data: tours } = await supa.from('tournaments').select('*').order('created_at', { ascending: false }).limit(500);
    const { data: regs } = await supa
      .from('registrations')
      .select('user_email, tournament_id')
      .eq('status', 'joined')
      .limit(5000);
    const { data: wallets } = await supa.from('wallets').select('balance').limit(5000);

    const tournaments = tours || [];
    const registrations = regs || [];
    const w = wallets || [];

    const now = Date.now();
    const isLive = (t: any) =>
      t.status !== 'completed' && !!t.match_time && new Date(t.match_time).getTime() <= now;
    const isUpcoming = (t: any) => t.status !== 'completed' && !isLive(t);

    const joinedByTournament: Record<string, number> = {};
    registrations.forEach((r: any) => {
      if (!r.tournament_id) return;
      joinedByTournament[r.tournament_id] = (joinedByTournament[r.tournament_id] || 0) + 1;
    });

    const liveMatches = tournaments.filter(isLive).map((t: any) => ({
      id: t.id,
      title: t.title,
      mode: t.mode,
      team_type: t.team_type,
      map: t.map,
      match_time: t.match_time,
      total_slots: Number(t.total_slots || 0),
      joined: joinedByTournament[t.id] || 0,
      entry_fee: Number(t.entry_fee || 0),
      prize_pool: Number(t.prize_pool || 0),
    }));

    return Response.json({
      tournaments: tournaments.length,
      live: liveMatches.length,
      upcoming: tournaments.filter(isUpcoming).length,
      registrations: registrations.length,
      players: new Set(registrations.map((r: any) => r.user_email).filter(Boolean)).size,
      coins: w.reduce((s: number, x: any) => s + Number(x.balance || 0), 0),
      prizePool: tournaments.reduce((s: number, t: any) => s + Number(t.prize_pool || 0), 0),
      liveMatches,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));