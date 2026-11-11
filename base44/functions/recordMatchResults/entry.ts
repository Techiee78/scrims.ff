import { getUserFromRequest, serviceClient } from '../../shared/supabase.ts';
import { creditWinnings } from '../../shared/wallet.ts';

export default async function (req: Request): Promise<Response> {
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
      .select('id, title, prize_pool, per_kill')
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

    // Payout, matching what the match card promises: the whole prize pool to
    // 1st place, plus per-kill coins to every player. Paid once per match —
    // saving the results again never pays a second time.
    const perKill = Number(tournament?.per_kill || 0);
    const prizePool = Number(tournament?.prize_pool || 0);
    let paid = 0;
    let payoutTotal = 0;

    if (perKill > 0 || prizePool > 0) {
      const { data: alreadyPaid } = await supa
        .from('wallet_transactions')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('type', 'credit')
        .limit(1);

      if (!alreadyPaid?.length) {
        for (const row of cleaned) {
          if (!row.email) continue;
          const coins = perKill * row.kills + (row.placement === 1 ? prizePool : 0);
          if (coins <= 0) continue;
          const label =
            row.placement === 1
              ? `Winner · ${tournament?.title || 'match'}`
              : `Per-kill reward · ${tournament?.title || 'match'}`;
          await creditWinnings(supa, row.email, coins, label, tournamentId);
          paid += 1;
          payoutTotal += coins;
        }
      }
    }

    return Response.json({ success: true, saved: updates.length, paid, payoutTotal });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}