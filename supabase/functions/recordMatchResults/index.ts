import { requireAdmin, serviceClient } from '../_shared/supabase.ts';

export default async function handler(req: Request): Promise<Response> {
  try {
    // Recording results pays coins out of the prize pool — always MFA-gated
    // once the admin has a second factor enrolled.
    const guard = await requireAdmin(req, { requireMfa: true });
    if (!guard.ok) return guard.response;
    const user = guard.value.admin;

    const body = await req.json();
    const tournamentId = body.tournament_id;
    const results = Array.isArray(body.results) ? body.results : [];
    if (!tournamentId) return Response.json({ error: 'Missing tournament' }, { status: 400 });
    if (!results.length) return Response.json({ error: 'No results to save' }, { status: 400 });

    const supa = serviceClient();
    const { data: tournament } = await supa
      .from('tournaments')
      .select('id, title, prize_pool, prize_1st, prize_2nd, prize_3rd, per_kill')
      .eq('id', tournamentId)
      .maybeSingle();
    if (!tournament) return Response.json({ error: 'Match not found' }, { status: 404 });

    const { data: regs } = await supa
      .from('registrations')
      .select('id, tournament_id, status, user_email')
      .eq('tournament_id', tournamentId)
      .eq('status', 'joined');
    const byId = new Map((regs || []).map((r: any) => [r.id, r]));

    const cleaned: Array<{ registration_id: number | string; email: string; kills: number; placement: number }> = [];
    for (const entry of results) {
      const reg = byId.get(entry.registration_id);
      if (!reg) continue;
      cleaned.push({
        registration_id: reg.id,
        email: reg.user_email,
        kills: Math.max(0, Math.floor(Number(entry.kills) || 0)),
        placement: Math.max(0, Math.floor(Number(entry.placement) || 0)),
      });
    }
    if (!cleaned.length) return Response.json({ error: 'No results to save' }, { status: 400 });

    // Payout, matching what the match card promises: the prize pool is split
    // into 1st / 2nd / 3rd place prizes and per-kill coins are paid from that
    // same pool. Matches created before the split existed still pay the whole
    // pool to 1st place.
    const perKill = Number(tournament.per_kill || 0);
    const prizePool = Number(tournament.prize_pool || 0);
    const splitTotal =
      Number(tournament.prize_1st || 0) +
      Number(tournament.prize_2nd || 0) +
      Number(tournament.prize_3rd || 0);
    const podiumPrize = (placement: number) => {
      if (placement < 1 || placement > 3) return 0;
      if (splitTotal <= 0) return placement === 1 ? prizePool : 0;
      const split = [tournament.prize_1st, tournament.prize_2nd, tournament.prize_3rd];
      return Number(split[placement - 1] || 0);
    };
    // Per-kill rewards share what is left of the pool after the podium prizes,
    // so a match can never pay out more than its prize pool.
    const podiumReserved = splitTotal > 0 ? splitTotal : prizePool;
    const killBudget = prizePool > 0 ? Math.max(0, prizePool - podiumReserved) : Infinity;
    const totalKills = cleaned.reduce((sum, row) => sum + row.kills, 0);
    const rawKillCoins = totalKills * perKill;
    const killCoins = Number.isFinite(killBudget) ? Math.min(rawKillCoins, killBudget) : rawKillCoins;
    const killRate = totalKills > 0 ? killCoins / totalKills : 0;

    // One payout row per player (a player never holds two slots in a match).
    const payoutBy = new Map<string, number>();
    if (perKill > 0 || prizePool > 0 || splitTotal > 0) {
      for (const row of cleaned) {
        if (!row.email) continue;
        const amount = Math.floor(row.kills * killRate) + podiumPrize(row.placement);
        payoutBy.set(row.email, (payoutBy.get(row.email) || 0) + Math.max(0, amount));
      }
    }
    const payouts = Array.from(payoutBy, ([email, amount]) => ({ email, amount }));

    // Results, winnings and the completed status land in one transaction — an
    // interruption can no longer leave the match half paid.
    const { data, error } = await supa.rpc('record_match_results', {
      p_tournament_id: tournamentId,
      p_results: cleaned.map((row) => ({
        registration_id: row.registration_id,
        kills: row.kills,
        placement: row.placement,
      })),
      p_payouts: payouts,
      p_label: `Winning · ${tournament.title || 'match'}`,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (data?.error) return Response.json({ error: data.error }, { status: data.status || 400 });

    // Payouts move real coins, so the action itself is recorded as well.
    try {
      await supa.from('admin_audit_log').insert({
        actor_id: user.id,
        actor_email: user.email,
        action: 'results.record',
        entity: 'tournament',
        entity_id: tournamentId,
        details: {
          title: tournament.title,
          players: cleaned.length,
          paid_total: payouts.reduce((sum, p) => sum + p.amount, 0),
        },
      });
    } catch (_e) {
      // The payout already committed; audit bookkeeping must not fail it.
    }

    return Response.json({ success: true, ...data });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));