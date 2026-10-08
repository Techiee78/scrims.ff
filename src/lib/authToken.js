// Shared helper: get the current Supabase access token so it can be
// passed to backend functions via the __supabase_token body field.
// This app authenticates via Supabase (not Base44 auth), so backend
// functions read the token from the body to verify the session.
import { getSupabase } from '@/lib/supabaseClient';

export async function getSupabaseToken() {
  try {
    const supa = await getSupabase();
    const { data: { session } } = await supa.auth.getSession();
    return session?.access_token || '';
  } catch (_e) {
    return '';
  }
}

// Wrap a backend function payload with the Supabase token.
export async function withAuth(payload = {}) {
  const __supabase_token = await getSupabaseToken();
  return { ...payload, __supabase_token };
}