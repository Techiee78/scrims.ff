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
    const message = body?.error || error.message || 'Something went wrong';
    const err = new Error(message);
    err.response = { data: body || { error: message } };
    throw err;
  }

  return { data };
}