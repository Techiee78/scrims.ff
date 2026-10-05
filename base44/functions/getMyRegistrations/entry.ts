import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { serviceClient } from '../../shared/supabase.ts';

// Returns the current user's joined registrations (Base44 identity).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
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
    return Response.json({ registrations: data || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}