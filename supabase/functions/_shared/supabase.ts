// Shared Supabase helpers for the app's own Edge Functions.
// Runs on Supabase Edge Runtime: config comes from the function's env vars
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically).
import { createClient } from 'npm:@supabase/supabase-js@2';

// Service-role client — bypasses RLS. Only ever used server-side.
export function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Shape of the user object returned to functions:
// { id, email, full_name, role, ff_ign, ff_uid, whatsapp }
export interface SupabaseUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  ff_ign?: string;
  ff_uid?: string;
  whatsapp?: string;
}

// Verifies the caller's Supabase access token against Supabase Auth and
// returns their identity merged with their public.profiles row, or null.
// Token source: the __supabase_token body field (what the app sends), or an
// Authorization: Bearer header when it carries a Supabase JWT.
export async function getUserFromRequest(req: Request): Promise<SupabaseUser | null> {
  try {
    let bodyToken: string | null = null;
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      if (body && typeof body.__supabase_token === 'string' && body.__supabase_token) {
        bodyToken = body.__supabase_token;
      }
    } catch (_e) {
      // no JSON body — ignore
    }

    const authHeader = req.headers.get('Authorization') || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const accessToken = bodyToken || headerToken;
    if (!accessToken) return null;

    const supa = serviceClient();
    const { data: authData, error: authError } = await supa.auth.getUser(accessToken);
    if (authError || !authData?.user) return null;

    const u = authData.user;
    let profile: any = null;
    try {
      const { data: p } = await supa.from('profiles').select('*').eq('id', u.id).maybeSingle();
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
      whatsapp: profile?.whatsapp || '',
    };
  } catch (_e) {
    return null;
  }
}

// Admin-only guard: the user when authenticated and an admin, otherwise null.
export async function getAdminFromRequest(req: Request): Promise<SupabaseUser | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  if (user.role !== 'admin') return null;
  return user;
}