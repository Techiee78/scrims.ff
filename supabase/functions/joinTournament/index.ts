import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { normalizePlayer, teamSizeOf } from '../_shared/players.ts';

// Books a slot for the signed-in player.
//
// The player identity always comes from the verified Supabase token — never
// from the request body. All checks that touch slots or coins (capacity, one
// slot per player, balance, the debit, the counter bump) run inside the
// join_tournament database function in a single locked transaction, so two
// people joining at the same moment cannot overfill a match, and a double tap
// cannot debit the entry fee twice.
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
    const tournamentId = Number(body.tournament_id);
    if (!Number.isFinite(tournamentId)) {
      return Response.json({ error: 'Missing tournament' }, { status: 400 });
    }

    // The joiner's own identity always comes from the verified profile row
    // loaded from the token — never from the request body. The join sheet shows
    // these read-only with an "Edit in profile" link, so nothing in the UI
    // changes; a tampered body simply cannot register someone else's details.
    const self = normalizePlayer({ ign: user.ff_ign, whatsapp: user.whatsapp, ff_uid: user.ff_uid });
    if (self.error) {
      return Response.json(
        { error: 'Your profile details are incomplete — update them in Profile and try again.' },
        { status: 400 }
      );
    }
    const me = self.player!;

    const supa = serviceClient();
    const { data: tournament } = await supa
      .from('tournaments')
      .select('id, title, mode, team_type, status, match_time, entry_fee')
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

    const { data, error } = await supa.rpc('join_tournament', {
      p_user_id: user.id,
      p_user_email: user.email,
      p_user_name: user.full_name || user.email,
      p_tournament_id: tournamentId,
      p_ff_ign: me.ign,
      p_ff_uid: me.ff_uid,
      p_whatsapp: me.whatsapp,
      p_teammates: details.map((item) => item.ign),
      p_teammate_details: details,
    });

    if (error) {
      return Response.json({ error: 'Could not book your slot. Please try again.' }, { status: 500 });
    }
    if (data?.error) {
      return Response.json({ error: data.error }, { status: Number(data.status) || 400 });
    }

    return Response.json({ success: true, balance: data?.balance, registration: data?.registration });
  } catch (_error: any) {
    return Response.json({ error: 'Could not book your slot. Please try again.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));