import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { serviceClient, getUserFromToken } from '../../shared/supabase.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await getUserFromToken(body.__supabase_token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supa = serviceClient();

    // Record the request
    await supa.from('deletion_requests').insert({
      user_id: user.id,
      user_email: user.email,
      status: 'pending',
    });

    // Best-effort: email the admins
    const { data: admins } = await supa.from('profiles').select('email').eq('role', 'admin');
    const recipients = (admins || []).map((a: any) => a.email).filter(Boolean);
    const name = user.full_name || user.email;
    const textBody =
      'Player ' + name + ' (' + user.email + ') requested deletion of their Scrims.ff account.\n\n' +
      'Please review and remove the account from the admin panel.';

    for (const email of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: 'Account deletion request',
          body: textBody,
        });
      } catch (_e) {
        // a single failed send shouldn't block the others
      }
    }

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}