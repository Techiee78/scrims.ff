import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req) {
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

    let registration = null;
    try {
      registration = await base44.asServiceRole.entities.Registration.get(registrationId);
    } catch (_notFound) {
      registration = null;
    }
    if (!registration) return Response.json({ error: 'Registration not found' }, { status: 404 });
    if (registration.user_email !== user.email) {
      return Response.json({ error: 'This registration belongs to another player' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.Registration.update(registrationId, {
      standings_screenshot: fileUri,
    });

    return Response.json({ success: true, registration: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}