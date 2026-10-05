import { serviceClient, getUserFromToken } from '../../shared/supabase.ts';
import { ensureWallet } from '../../shared/wallet.ts';
import { slotCapacity } from '../../shared/slots.ts';

function teamSize(teamType: string) {
  if (teamType === 'Duo') return 2;
  if (teamType === 'Squad') return 4;
  return 1;
}

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const user = await getUserFromToken(body.__supabase_token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tournamentId = body.tournament_id;
    const ign = (body.ff_ign || '').trim();
    const uid = (body.ff_uid || '').trim();
    const teammates = Array.isArray(body.teammates)
      ? body.teammates.map((t: string) => String(t).trim()).filter(Boolean)
      : [];

    if (!tournamentId) return Response.json({ error: 'Missing tournament' }, { status: 400 });
    if (!ign || !uid) return Response.json({ error: 'In-game name and UID are required' }, { status: 400 });

    const supa = serviceClient();

    const { data: tournament } = await supa
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle();
    if (!tournament) return Response.json({ error: 'Match not found' }, { status: 404 });

    const expectedTeammates = Math.max(0, teamSize(tournament.team_type) - 1);
    if (teammates.length !== expectedTeammates) {
      return Response.json(
        {
          error:
            'This ' + (tournament.team_type || 'Solo') + ' match needs ' +
            expectedTeammates + ' teammate name' + (expectedTeammates === 1 ? '' : 's'),
        },
        { status: 400 }
      );
    }

    const { data: already } = await supa
      .from('registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .eq('status', 'joined')
      .maybeSingle();
    if (already) return Response.json({ error: 'You have already joined this match' }, { status: 400 });

    const filled = tournament.filled_slots || 0;
    const capacity = slotCapacity(tournament.mode, tournament.team_type);
    if (filled >= capacity) return Response.json({ error: 'All slots for this match are full' }, { status: 400 });

    const wallet = await ensureWallet(supa, user.id, user.email);
    const fee = tournament.entry_fee || 0;
    if ((wallet.balance || 0) < fee) {
      return Response.json({ error: 'Not enough coins — top up your wallet to join' }, { status: 400 });
    }

    const newBalance = (wallet.balance || 0) - fee;

    if (fee > 0) {
      await supa.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
      await supa.from('wallet_transactions').insert({
        user_id: user.id,
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
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        ff_ign: ign,
        ff_uid: uid,
        teammates,
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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}