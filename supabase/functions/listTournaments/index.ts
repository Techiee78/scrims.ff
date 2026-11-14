import { serviceClient } from '../_shared/supabase.ts';

// Public read of the match board (newest first).
//
// Room ID and password are deliberately NOT part of this payload: anyone can
// call this endpoint without signing in. A player's room details come from
// getMyRegistrations, which only returns rooms for matches they joined.
const PUBLIC_COLUMNS = [
  'id',
  'title',
  'description',
  'mode',
  'team_type',
  'map',
  'map_name',
  'entry_fee',
  'prize_pool',
  'per_kill',
  'prize_1st',
  'prize_2nd',
  'prize_3rd',
  'match_time',
  'start_time',
  'total_slots',
  'max_slots',
  'filled_slots',
  'banner_url',
  'status',
  'featured',
  'created_at',
  'updated_at',
].join(', ');

export default async function handler(_req: Request): Promise<Response> {
  try {
    const supa = serviceClient();
    const { data, error } = await supa
      .from('tournaments')
      .select(PUBLIC_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return Response.json({ tournaments: data || [] });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));