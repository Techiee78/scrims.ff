// Returns the public Supabase URL and anon key to the frontend.
// The anon key is designed to be public — it is protected by RLS.
// The service_role key is NEVER exposed here.
export default async function handler(_req: Request): Promise<Response> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    return Response.json({ url, anonKey });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));