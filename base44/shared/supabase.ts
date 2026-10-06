// Shared Supabase helpers for backend functions.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { secrets } from 'base44:runtime';

// Service-role client — bypasses RLS. Use only inside backend functions.
export function serviceClient() {
  return createClient(secrets.get('SUPABASE_URL'), secrets.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Shape of the user object returned to functions:
// { id, email, full_name, role, ff_ign, ff_uid }
export interface SupabaseUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  ff_ign?: string;
  ff_uid?: string;
}

// Extracts the Supabase access token from the request and verifies it
// against Supabase Auth. Returns the user row (merged with their
// public.profiles row) or null if unauthenticated/invalid.
export async function getUserFromRequest(req: Request): Promise<SupabaseUser | null> {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    // Also accept a token in the JSON body for non-standard callers.
    let accessToken = token;
    if (!accessToken) {
      try {
        const cloned = req.clone();
        const body = await cloned.json();
        if (body && typeof body.__supabase_token === 'string') {
          accessToken = body.__supabase_token;
        }
      } catch (_e) {
        // not JSON or no body — ignore
      }
    }
    if (!accessToken) return null;

    const supa = serviceClient();
    const { data: authData, error: authError } = await supa.auth.getUser(accessToken);
    if (authError || !authData?.user) return null;

    const u = authData.user;
    let profile: any = null;
    try {
      const { data: p } = await supa
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();
      profile = p;
    } catch (_e) {
      // profiles table may not exist yet — degrade gracefully.
    }

    return {
      id: u.id,
      email: u.email || profile?.email || '',
      full_name: profile?.full_name || (u.user_metadata?.full_name as string) || '',
      role: profile?.role || 'user',
      ff_ign: profile?.ff_ign || '',
      ff_uid: profile?.ff_uid || '',
    };
  } catch (_e) {
    return null;
  }
}

// Admin-only guard. Returns the user if authenticated and an admin,
// otherwise null. Use with a 401/403 response when null.
export async function getAdminFromRequest(req: Request): Promise<SupabaseUser | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  if (user.role !== 'admin') return null;
  return user;
}