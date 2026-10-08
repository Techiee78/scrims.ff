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
// Token sources, in priority order:
//   1. Authorization: Bearer <token> header (when it's a Supabase JWT)
//   2. __supabase_token field in the JSON body (frontend passes this)
// The Base44 SDK injects its own platform token into the Authorization
// header; this app authenticates via Supabase, so the body field is the
// reliable path for Supabase-authenticated calls.
export async function getUserFromRequest(req: Request): Promise<SupabaseUser | null> {
  try {
    // Read the body first (non-destructively via clone) so both the header
    // and body paths can be checked. The body is the source of truth for
    // the Supabase token in this app.
    let bodyToken: string | null = null;
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      if (body && typeof body.__supabase_token === 'string' && body.__supabase_token) {
        bodyToken = body.__supabase_token;
      }
    } catch (_e) {
      // not JSON or no body — ignore
    }

    const authHeader = req.headers.get('Authorization') || '';
    const headerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    // Prefer the explicit Supabase token from the body; fall back to the
    // header token (which may be the Base44 platform token — if so,
    // supa.auth.getUser will reject it and return null).
    const accessToken = bodyToken || headerToken;
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