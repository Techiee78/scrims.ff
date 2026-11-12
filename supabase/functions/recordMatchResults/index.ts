import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { adjustWinnings } from '../_shared/wallet.ts';

export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Organizers only' }, { status: 403 });

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

    const { data: regs } = await supa
      .from('registrations')
      .select('id, tournament_id, status, user_email')
      .eq('tournament_id', tournamentId)
      .eq('status', 'joined');
    const byId = new Map((regs || []).map((r: any) => [r.id, r]));

    const cleaned: Array<{ id: number | string; email: string; kills: number; placement: number }> = [];
    const updates: Promise<any>[] = [];
    for (const entry of results) {
      const reg = byId.get(entry.registration_id);
      if (!reg) continue;
      const kills = Math.max(0, Math.floor(Number(entry.kills) || 0));
      const placement = Math.max(0, Math.floor(Number(entry.placement) || 0));
      cleaned.push({ id: reg.id, email: reg.user_email, kills, placement });
      updates.push(
        supa.from('registrations').update({ kills, placement, played: placement > 0 }).eq('id', reg.id)
      );
    }
    await Promise.all(updates);

    // Payout, matching what the match card promises: the prize pool is split
    // into 1st / 2nd / 3rd place prizes and per-kill coins are paid from that
    // same pool. Matches created before the split existed still pay the whole
    // pool to 1st place. Paid once per match — saving the results again never
    // pays a second time.
    const perKill = Number(tournament?.per_kill || 0);
    const prizePool = Number(tournament?.prize_pool || 0);
    const splitTotal =
      Number(tournament?.prize_1st || 0) +
      Number(tournament?.prize_2nd || 0) +
      Number(tournament?.prize_3rd || 0);
    const podiumPrize = (placement: number) => {
      if (placement < 1 || placement > 3) return 0;
      if (splitTotal <= 0) return placement === 1 ? prizePool : 0;
      const split = [tournament?.prize_1st, tournament?.prize_2nd, tournament?.prize_3rd];
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

    let paid = 0;
    let adjusted = 0;
    let payoutTotal = 0;

    if (perKill > 0 || prizePool > 0 || splitTotal > 0) {
      // A match is paid once, but if the admin edits the results afterwards the
      // already-paid "Winning" entries are corrected to the new amounts.
      const { data: existing } = await supa
        .from('wallet_transactions')
        .select('id, user_email, amount')
        .eq('tournament_id', tournamentId)
        .eq('type', 'credit');
      const paidBy = new Map((existing || []).map((row: any) => [row.user_email, row]));
      const label = `Winning · ${tournament?.title || 'match'}`;

      for (const row of cleaned) {
        if (!row.email) continue;
        const coins = Math.floor(row.kills * killRate) + podiumPrize(row.placement);
        const previous = paidBy.get(row.email);
        const previousAmount = Number(previous?.amount || 0);
        if (coins === previousAmount) {
          payoutTotal += coins;
          continue;
        }
        if (!previous && coins <= 0) continue;
        await adjustWinnings(supa, row.email, coins, label, tournamentId, previous);
        if (previous) adjusted += 1;
        else paid += 1;
        payoutTotal += Math.max(0, coins);
      }
    }

    return Response.json({ success: true, saved: updates.length, paid, adjusted, payoutTotal });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));