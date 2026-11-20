import { createClient } from 'npm:@supabase/supabase-js@2';

// Public list of the players holding a slot in one match.
//
// Only in-game names and slot numbers leave the server — WhatsApp numbers,
// Free Fire UIDs and emails stay private. Anyone can call this without
// signing in, so it must never carry anything more.
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function handler(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const tournamentId = body?.tournament_id;
    if (tournamentId === undefined || tournamentId === null || tournamentId === '') {
      return Response.json({ error: 'Missing match' }, { status: 400 });
    }

    const supa = serviceClient();
    const { data, error } = await supa
      .from('registrations')
      .select('slot_number, ff_ign, teammates')
      .eq('tournament_id', tournamentId)
      .eq('status', 'joined')
      .order('slot_number', { ascending: true })
      .limit(200);
    if (error) throw error;

    const players = (data || []).map((row: any) => ({
      slot: row.slot_number,
      ign: row.ff_ign || '',
      teammates: Array.isArray(row.teammates) ? row.teammates : [],
    }));

    return Response.json({ players });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const res = await handler(req);
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  return new Response(res.body, { status: res.status, headers });
});