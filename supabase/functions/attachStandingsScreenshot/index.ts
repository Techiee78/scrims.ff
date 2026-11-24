import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';

export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const registrationId = body.registration_id;
    const fileUri = body.file_uri;
    if (!registrationId || !fileUri) {
      return Response.json({ error: 'Missing registration or file' }, { status: 400 });
    }

    const supa = serviceClient();
    // Ownership is the immutable auth id. A registration that carries no owner
    // is never treated as the caller's, so an email match alone grants nothing.
    const { data: registration } = await supa
      .from('registrations')
      .select('id, user_id')
      .eq('id', registrationId)
      .maybeSingle();
    if (!registration) return Response.json({ error: 'Registration not found' }, { status: 404 });
    if (!registration.user_id || registration.user_id !== user.id) {
      return Response.json({ error: 'This registration belongs to another player' }, { status: 403 });
    }

    await supa.from('registrations').update({ standings_screenshot: fileUri }).eq('id', registrationId);
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));