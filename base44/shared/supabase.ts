// Shared Supabase helper for backend functions.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { secrets } from 'base44:runtime';

// Service-role client — bypasses RLS. Use only inside backend functions.
// Identity still comes from Base44 (base44.auth.me()); Supabase holds the data.
export function serviceClient() {
  return createClient(secrets.get('SUPABASE_URL'), secrets.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}