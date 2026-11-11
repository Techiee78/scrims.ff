import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';

// Admin-only user management: list profiles and toggle admin role.
//   { action: 'list' }
//   { action: 'update', user_id, role }
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const supa = serviceClient();

    if (body.action === 'list' || !body.action) {
      const { data, error } = await supa
        .from('profiles')
        .select('id, email, full_name, role, ff_ign, ff_uid, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ users: data || [] });
    }

    if (body.action === 'update') {
      const targetId = body.user_id;
      const newRole = body.role;
      if (!targetId || typeof targetId !== 'string') {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }
      if (newRole !== 'admin' && newRole !== 'user') {
        return Response.json({ error: 'role must be "admin" or "user"' }, { status: 400 });
      }
      // Prevent an admin from demoting themselves (locking themselves out).
      if (targetId === user.id && newRole !== 'admin') {
        return Response.json({ error: 'You cannot remove your own admin role' }, { status: 400 });
      }

      const { data, error } = await supa
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select('id, email, full_name, role')
        .maybeSingle();

      if (error) return Response.json({ error: error.message }, { status: 500 });
      if (!data) return Response.json({ error: 'User not found' }, { status: 404 });
      return Response.json({ user: data });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(handler);