import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { serviceClient } from '../../shared/supabase.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const registrationId = body.registration_id;
    const fileUri = body.file_uri;
    if (!registrationId || !fileUri) {
      return Response.json({ error: 'Missing registration or file' }, { status: 400 });
    }

    const supa = serviceClient();
    const { data: registration } = await supa
      .from('registrations')
      .select('id, user_email')
      .eq('id', registrationId)
      .maybeSingle();
    if (!registration) return Response.json({ error: 'Registration not found' }, { status: 404 });
    if (registration.user_email !== user.email) {
      return Response.json({ error: 'This registration belongs to another player' }, { status: 403 });
    }

    await supa.from('registrations').update({ standings_screenshot: fileUri }).eq('id', registrationId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}