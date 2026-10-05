import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ensureWallet } from '../../shared/wallet.ts';
import { slotCapacity } from '../../shared/slots.ts';

function teamSize(teamType) {
  if (teamType === 'Duo') return 2;
  if (teamType === 'Squad') return 4;
  return 1;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const tournamentId = body.tournament_id;
    const ign = (body.ff_ign || '').trim();
    const uid = (body.ff_uid || '').trim();
    const teammates = Array.isArray(body.teammates)
      ? body.teammates.map((t) => String(t).trim()).filter(Boolean)
      : [];

    if (!tournamentId) return Response.json({ error: 'Missing tournament' }, { status: 400 });
    if (!ign || !uid) return Response.json({ error: 'In-game name and UID are required' }, { status: 400 });

    let tournament = null;
    try {
      tournament = await base44.asServiceRole.entities.Tournament.get(tournamentId);
    } catch (notFound) {
      tournament = null;
    }
    if (!tournament) return Response.json({ error: 'Match not found' }, { status: 404 });

    const expectedTeammates = Math.max(0, teamSize(tournament.team_type) - 1);
    if (teammates.length !== expectedTeammates) {
      return Response.json(
        {
          error:
            'This ' + (tournament.team_type || 'Solo') + ' match needs ' +
            expectedTeammates + ' teammate name' + (expectedTeammates === 1 ? '' : 's')
        },
        { status: 400 }
      );
    }

    const already = await base44.asServiceRole.entities.Registration.filter({
      tournament_id: tournamentId,
      user_email: user.email,
      status: 'joined'
    });
    if (already.length > 0) return Response.json({ error: 'You have already joined this match' }, { status: 400 });

    const filled = tournament.filled_slots || 0;
    const capacity = slotCapacity(tournament.mode, tournament.team_type);
    if (filled >= capacity) return Response.json({ error: 'All slots for this match are full' }, { status: 400 });

    const wallet = await ensureWallet(base44, user.email);
    const fee = tournament.entry_fee || 0;
    if ((wallet.balance || 0) < fee) {
      return Response.json({ error: 'Not enough coins — top up your wallet to join' }, { status: 400 });
    }

    const newBalance = (wallet.balance || 0) - fee;

    if (fee > 0) {
      await base44.asServiceRole.entities.Wallet.update(wallet.id, { balance: newBalance });
      await base44.asServiceRole.entities.WalletTransaction.create({
        user_email: user.email,
        type: 'debit',
        amount: fee,
        label: 'Entry fee · ' + tournament.title,
        balance_after: newBalance,
        tournament_id: tournamentId
      });
    }

    const registration = await base44.asServiceRole.entities.Registration.create({
      tournament_id: tournamentId,
      tournament_title: tournament.title,
      mode: tournament.mode,
      user_email: user.email,
      user_name: user.full_name || user.email,
      ff_ign: ign,
      ff_uid: uid,
      teammates: teammates,
      slot_number: filled + 1,
      entry_fee: fee,
      status: 'joined'
    });

    await base44.asServiceRole.entities.Tournament.update(tournament.id, {
      filled_slots: filled + 1,
      total_slots: capacity
    });

    return Response.json({ success: true, balance: newBalance, registration });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}