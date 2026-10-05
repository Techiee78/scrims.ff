import { secrets } from 'base44:runtime';

// Returns the public Supabase project URL + anon key to the frontend so it can
// initialize the Supabase client. The anon key is public by design (RLS guards
// the data). The service_role key is NEVER returned here.
export default async function (req: Request): Promise<Response> {
  try {
    return Response.json({
      url: secrets.get('SUPABASE_URL'),
      anonKey: secrets.get('SUPABASE_ANON_KEY'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}