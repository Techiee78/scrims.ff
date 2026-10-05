import { serviceClient } from '../../shared/supabase.ts';

// Public read of all tournaments (ordered newest first).
export default async function (req: Request): Promise<Response> {
  try {
    const supa = serviceClient();
    const { data, error } = await supa
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return Response.json({ tournaments: data || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}