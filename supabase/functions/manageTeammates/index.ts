import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';
import { normalizePlayer } from '../_shared/players.ts';

// Saved teammate roster for the signed-in player.
// Actions: list | create | update | delete — always scoped to the caller.
const MAX_TEAMMATES = 5;

export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const rate = await checkUserRateLimit(serviceClient(), user.id, 'manage_teammates', 300, 30);
    if (rate === false) return Response.json({ error: 'Too many teammate actions. Please wait and try again.' }, { status: 429 });
    if (rate === null) return Response.json({ error: 'Request protection is temporarily unavailable.' }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const supa = serviceClient();

    if (action === 'list') {
      // Ownership is the immutable auth id, never the email.
      const { data, error } = await supa
        .from('teammates')
        .select('id, ign, whatsapp, ff_uid, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return Response.json({ teammates: data || [] });
    }

    if (action === 'create' || action === 'update') {
      const parsed = normalizePlayer(body.teammate);
      if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
      const player = parsed.player!;

      if (action === 'create') {
        const { count } = await supa
          .from('teammates')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if ((count || 0) >= MAX_TEAMMATES) {
          return Response.json(
            { error: `You can save up to ${MAX_TEAMMATES} teammates — remove one to add another.` },
            { status: 400 }
          );
        }

        const { data, error } = await supa
          .from('teammates')
          .insert({
            user_id: user.id,
            user_email: user.email,
            ign: player.ign,
            whatsapp: player.whatsapp,
            ff_uid: player.ff_uid,
          })
          .select('id, ign, whatsapp, ff_uid, created_at')
          .single();
        if (error) throw error;
        return Response.json({ teammate: data });
      }

      const id = body.id;
      if (!id) return Response.json({ error: 'Missing teammate' }, { status: 400 });
      const { data, error } = await supa
        .from('teammates')
        .update({ ign: player.ign, whatsapp: player.whatsapp, ff_uid: player.ff_uid })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, ign, whatsapp, ff_uid, created_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({ error: 'Teammate not found' }, { status: 404 });
      return Response.json({ teammate: data });
    }

    if (action === 'delete') {
      const id = body.id;
      if (!id) return Response.json({ error: 'Missing teammate' }, { status: 400 });
      const { error } = await supa
        .from('teammates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));