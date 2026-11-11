// Frontend Supabase client. Lazily initialized after fetching the
// public URL + anon key from the getSupabaseConfig backend function.
// The anon key is public by design and protected by RLS; the
// service_role key is never used client-side.
import { createClient } from '@supabase/supabase-js';

// The app's own Supabase project — this endpoint only returns the public
// project URL and anon key (protected by RLS), so it is safe client-side.
const CONFIG_URL = 'https://jnasifwfiuhrvfqelpid.supabase.co/functions/v1/getSupabaseConfig';

let cachedConfig = null;
let clientPromise = null;

async function loadConfig() {
  if (cachedConfig) return cachedConfig;
  const res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error('Supabase config unavailable');
  const data = await res.json();
  if (!data?.url || !data?.anonKey) {
    throw new Error('Supabase config unavailable');
  }
  cachedConfig = { url: data.url, anonKey: data.anonKey };
  return cachedConfig;
}

export async function getSupabase() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const { url, anonKey } = await loadConfig();
    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  })();
  return clientPromise;
}

// Pre-warm: resolves the client (and triggers the config fetch) so
// the AuthProvider can await it on boot.
export async function primeSupabase() {
  return getSupabase();
}