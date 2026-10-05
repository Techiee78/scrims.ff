import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/functions/getSupabaseConfig';

let _client = null;

// Lazily creates the Supabase client using credentials fetched from the
// getSupabaseConfig backend function (so the anon key never sits in the
// committed frontend source). Cached after first call.
export async function getSupabase() {
  if (_client) return _client;
  const res = await getSupabaseConfig();
  const cfg = res?.data || {};
  _client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

// Current Supabase access token — passed to backend functions that need to
// verify identity server-side (as `__supabase_token` in the payload).
export async function getAccessToken() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}