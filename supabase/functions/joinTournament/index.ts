import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { ensureWallet } from '../_shared/wallet.ts';
import { slotCapacity } from '../_shared/slots.ts';
import { normalizePlayer, teamSizeOf } from '../_shared/players.ts';

export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // A player must finish their profile before taking a slot.
    const profileMissing = [
      String(user.ff_ign || '').trim() ? '' : 'Free Fire IGN',
      String(user.ff_uid || '').trim() ? '' : 'Free Fire UID',
      String(user.whatsapp || '').replace(/\D/g, '').length === 10 ? '' : 'WhatsApp number',
    ].filter(Boolean);
    if (profileMissing.length) {
      return Response.json(
        { error: 'Complete your profile before joining — add ' + profileMissing.join(', ') + ' in Profile.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const tournamentId = body.tournament_id;
    if (!tournamentId) return Response.json({ error: 'Missing tournament' }, { status: 400 });

    const self = normalizePlayer({ ign: body.ff_ign, whatsapp: body.whatsapp, ff_uid: body.ff_uid });
    if (self.error) return Response.json({ error: self.error }, { status: 400 });
    const me = self.player!;

    const supa = serviceClient();
    const { data: tournament } = await supa
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle();
    if (!tournament) return Response.json({ error: 'Match not found' }, { status: 404 });

    const expectedTeammates = Math.max(0, teamSizeOf(tournament.team_type) - 1);
    const rawTeammates = Array.isArray(body.teammates) ? body.teammates : [];
    if (rawTeammates.length !== expectedTeammates) {
      return Response.json(
        {
          error:
            'This ' + (tournament.team_type || 'Solo') + ' match needs ' + expectedTeammates +
            ' teammate' + (expectedTeammates === 1 ? '' : 's'),
        },
        { status: 400 }
      );
    }

    // Every teammate needs IGN + WhatsApp + UID, and no player may take
    // two slots in the same match (including the joiner).
    const details: Array<{ ign: string; whatsapp: string; ff_uid: string; teammate_id: string | null }> = [];
    for (const raw of rawTeammates) {
      const parsed = normalizePlayer(raw);
      if (parsed.error) {
        return Response.json({ error: `Teammate details incomplete — ${parsed.error}` }, { status: 400 });
      }
      details.push({ ...parsed.player!, teammate_id: raw?.teammate_id ?? null });
    }

    const allUids = [me.ff_uid, ...details.map((item) => item.ff_uid)];
    if (new Set(allUids).size !== allUids.length) {
      return Response.json(
        { error: 'A player can hold only one slot in a match — check the UIDs you entered' },
        { status: 400 }
      );
    }

    const { data: already } = await supa
      .from('registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_email', user.email)
      .eq('status', 'joined')
      .maybeSingle();
    if (already) return Response.json({ error: 'You already hold a slot in this match' }, { status: 400 });

    const filled = tournament.filled_slots || 0;
    const capacity = slotCapacity(tournament.mode, tournament.team_type);
    if (filled >= capacity) return Response.json({ error: 'All slots for this match are full' }, { status: 400 });

    const wallet = await ensureWallet(supa, user.email);
    const fee = tournament.entry_fee || 0;
    if ((wallet.balance || 0) < fee) {
      return Response.json({ error: 'Not enough coins — top up your wallet to join' }, { status: 400 });
    }

    const newBalance = (wallet.balance || 0) - fee;

    if (fee > 0) {
      await supa.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
      await supa.from('wallet_transactions').insert({
        user_email: user.email,
        type: 'debit',
        amount: fee,
        label: 'Entry fee · ' + tournament.title,
        balance_after: newBalance,
        tournament_id: tournamentId,
      });
    }

    const { data: registration } = await supa
      .from('registrations')
      .insert({
        tournament_id: tournamentId,
        tournament_title: tournament.title,
        mode: tournament.mode,
        user_email: user.email,
        user_name: user.full_name || user.email,
        ff_ign: me.ign,
        ff_uid: me.ff_uid,
        whatsapp: me.whatsapp,
        teammates: details.map((item) => item.ign),
        teammate_details: details,
        slot_number: filled + 1,
        entry_fee: fee,
        status: 'joined',
      })
      .select()
      .single();

    await supa
      .from('tournaments')
      .update({ filled_slots: filled + 1, total_slots: capacity })
      .eq('id', tournamentId);

    return Response.json({ success: true, balance: newBalance, registration });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));