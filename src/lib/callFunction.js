// Calls the app's own Supabase Edge Functions.
// Mirrors the old response shape ({ data }) and throws with
// err.response.data.error so existing error handling keeps working.
import { getSupabase } from '@/lib/supabaseClient';

export async function callFunction(name, payload = {}) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke(name, { body: payload });

  if (error) {
    let body = null;
    try {
      body = await error.context?.json();
    } catch (_e) {
      body = null;
    }
    // An expired or revoked sign-in — drop the stale session and send the
    // player back to the login screen with a clear reason instead of a
    // generic failed request.
    if (error.context?.status === 401) {
      try {
        await supabase.auth.signOut();
      } catch (_e) {
        // ignore
      }
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
      const expired = new Error('Your session expired — please log in again.');
      expired.code = 'session_expired';
      throw expired;
    }

    const message = body?.error || error.message || 'Something went wrong';
    const err = new Error(message);
    err.response = { data: body || { error: message } };
    throw err;
  }

  return { data };
}