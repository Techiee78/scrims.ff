import { serviceClient, getUserFromToken } from '../../shared/supabase.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const user = await getUserFromToken(body.__supabase_token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const registrationId = body.registration_id;
    const filePath = body.file_path;
    if (!registrationId || !filePath) {
      return Response.json({ error: 'Missing registration or file' }, { status: 400 });
    }

    const supa = serviceClient();
    const { data: registration } = await supa
      .from('registrations')
      .select('id, user_id')
      .eq('id', registrationId)
      .maybeSingle();
    if (!registration) return Response.json({ error: 'Registration not found' }, { status: 404 });
    if (registration.user_id !== user.id) {
      return Response.json({ error: 'This registration belongs to another player' }, { status: 403 });
    }

    await supa
      .from('registrations')
      .update({ standings_screenshot: filePath })
      .eq('id', registrationId);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}