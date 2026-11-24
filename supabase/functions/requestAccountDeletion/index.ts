import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { checkUserRateLimit } from '../_shared/rateLimit.ts';

// Records the player's account-deletion request for the organizers to action.
// (The old version emailed admins through Base44's email integration; an
// independent app has no mail provider wired in, so the request is stored.)
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const rate = await checkUserRateLimit(serviceClient(), user.id, 'account_deletion_request', 86400, 1);
    if (rate === false) return Response.json({ error: 'A deletion request was already submitted recently.' }, { status: 429 });
    if (rate === null) return Response.json({ error: 'Request protection is temporarily unavailable.' }, { status: 503 });

    const supa = serviceClient();
    let recorded = false;
    try {
      const { error } = await supa
        .from('deletion_requests')
        .insert({ user_email: user.email, status: 'pending' });
      recorded = !error;
    } catch (_e) {
      // best-effort record
    }

    return Response.json({ success: true, recorded });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));