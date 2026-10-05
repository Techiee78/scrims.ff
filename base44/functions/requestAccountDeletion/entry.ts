import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const recipients = (admins || []).map((a) => a.email).filter(Boolean);
    const name = user.full_name || user.email;
    const body =
      'Player ' + name + ' (' + user.email + ') requested deletion of their Scrims.ff account.\n\n' +
      'Please review and remove the account from the admin panel.';

    for (const email of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Account deletion request',
        body,
      });
    }

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}