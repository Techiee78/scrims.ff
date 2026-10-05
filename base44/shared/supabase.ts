// Shared Supabase helpers for backend functions.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { secrets } from 'base44:runtime';

// Service-role client — bypasses RLS. Use only inside backend functions for
// privileged operations (admin writes, wallet mutations, etc.).
export function serviceClient() {
  return createClient(secrets.get('SUPABASE_URL'), secrets.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Verifies a Supabase access token (sent from the frontend in the payload as
// `__supabase_token`) and returns the user's id, email, full_name and role.
// Returns null if the token is missing or invalid.
export async function getUserFromToken(token: string) {
  if (!token) return null;
  const anon = createClient(secrets.get('SUPABASE_URL'), secrets.get('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return null;
  const u = data.user;
  const supa = serviceClient();
  const { data: profile } = await supa
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', u.id)
    .maybeSingle();
  return {
    id: u.id,
    email: u.email,
    full_name: profile?.full_name || u.user_metadata?.full_name || '',
    role: profile?.role || 'user',
  };
}