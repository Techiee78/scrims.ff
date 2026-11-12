import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';

// Returns the current user's joined registrations (Supabase identity).
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const supa = serviceClient();
    const { data, error } = await supa
      .from('registrations')
      .select('*')
      .eq('user_email', user.email)
      .eq('status', 'joined')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;

    // What each match actually paid this player, so a finished match can show
    // the prize won right on the card.
    const { data: winnings } = await supa
      .from('wallet_transactions')
      .select('tournament_id, amount')
      .eq('user_email', user.email)
      .eq('type', 'credit')
      .not('tournament_id', 'is', null);

    return Response.json({ registrations: data || [], winnings: winnings || [] });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));