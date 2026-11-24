import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';

export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const rate = await checkUserRateLimit(serviceClient(), user.id, 'attach_standings_screenshot', 3600, 5);
    if (rate === false) return Response.json({ error: 'Too many screenshot submissions. Please try later.' }, { status: 429 });
    if (rate === null) return Response.json({ error: 'Request protection is temporarily unavailable.' }, { status: 503 });

    const body = await req.json();
    const registrationId = body.registration_id;
    const fileUri = typeof body.file_uri === 'string' ? body.file_uri.trim() : '';
    if (!registrationId || !fileUri) {
      return Response.json({ error: 'Missing registration or file' }, { status: 400 });
    }
    // Only accept this player's uploaded image path in the private bucket; reject external URLs.
    const safePath = new RegExp(`^${user.id}/[a-zA-Z0-9_-]+\\.(?:jpg|jpeg|png|webp)$`, 'i');
    if (fileUri.length > 200 || !safePath.test(fileUri) || fileUri.includes('..') || fileUri.includes('://')) {
      return Response.json({ error: 'Invalid screenshot path' }, { status: 400 });
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

    const { data: updated, error: updateError } = await supa
      .from('registrations')
      .update({ standings_screenshot: fileUri })
      .eq('id', registrationId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();
    if (updateError) return Response.json({ error: 'Could not save screenshot.' }, { status: 500 });
    if (!updated) return Response.json({ error: 'Registration not found' }, { status: 404 });
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));