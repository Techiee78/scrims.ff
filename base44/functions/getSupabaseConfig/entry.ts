// Returns the public Supabase URL and anon key to the frontend.
// The anon key is designed to be public — it is protected by RLS.
// The service_role key is NEVER exposed here.
import { secrets } from 'base44:runtime';

export default async function (_req: Request): Promise<Response> {
  try {
    const url = secrets.get('SUPABASE_URL');
    const anonKey = secrets.get('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    return Response.json({ url, anonKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}