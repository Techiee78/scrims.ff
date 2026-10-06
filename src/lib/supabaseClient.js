// Frontend Supabase client. Lazily initialized after fetching the
// public URL + anon key from the getSupabaseConfig backend function.
// The anon key is public by design and protected by RLS; the
// service_role key is never used client-side.
import { createClient } from '@supabase/supabase-js';
import { base44 } from '@/api/base44Client';

let cachedConfig = null;
let clientPromise = null;

async function loadConfig() {
  if (cachedConfig) return cachedConfig;
  const res = await base44.functions.invoke('getSupabaseConfig', {});
  const data = res?.data ?? res;
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