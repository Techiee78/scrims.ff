import { serviceClient } from '../_shared/supabase.ts';

// Public read of all tournaments (newest first).
export default async function handler(_req: Request): Promise<Response> {
  try {
    const supa = serviceClient();
    const { data, error } = await supa
      .from('tournaments')
      .select('*')
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