import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';

// Returns the current user's joined registrations (Supabase identity).
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const supa = serviceClient();
    const { data, error } = await supa
      .from('registrations')
      .select(
        'id, tournament_id, tournament_title, mode, user_name, ff_ign, teammates, teammate_details, slot_number, entry_fee, status, standings_screenshot, kills, placement, created_at'
      )
      .eq('user_id', user.id)
      .eq('status', 'joined')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;

    // What each match actually paid this player, so a finished match can show
    // the prize won right on the card.
    const { data: winnings } = await supa
      .from('wallet_transactions')
      .select('tournament_id, amount')
      .eq('user_id', user.id)
      .eq('type', 'credit')
      .not('tournament_id', 'is', null);

    // Room details are only handed to the players who hold a slot, never on
    // the public match board.
    const ids = (data || []).map((row: any) => row.tournament_id).filter(Boolean);
    let rooms: any[] = [];
    if (ids.length > 0) {
      const { data: roomRows } = await supa
        .from('tournaments')
        .select('id, room_id, room_password')
        .in('id', ids);
      rooms = (roomRows || []).map((row: any) => ({
        tournament_id: row.id,
        room_id: row.room_id || '',
        room_password: row.room_password || '',
      }));
    }

    return Response.json({ registrations: data || [], winnings: winnings || [], rooms });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));