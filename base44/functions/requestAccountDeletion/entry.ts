import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getUserFromRequest, serviceClient } from '../../shared/supabase.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supa = serviceClient();
    try {
      await supa.from('deletion_requests').insert({ user_email: user.email, status: 'pending' });
    } catch (_e) {
      // best-effort record
    }

    // Notify admins (profiles with role = 'admin') via the Core SendEmail
    // integration, which still runs through the platform service role.
    const { data: admins } = await supa
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .limit(50);
    const recipients = (admins || []).map((a: any) => a.email).filter(Boolean);
    const name = user.full_name || user.email;
    const textBody =
      'Player ' + name + ' (' + user.email + ') requested deletion of their Scrims.ff account.\n\n' +
      'Please review and remove the account from the admin panel.';

    const base44 = createClientFromRequest(req);
    for (const email of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: 'Account deletion request',
          body: textBody,
        });
      } catch (_pushError) {
        // a single failed send shouldn't block the others
      }
    }

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}