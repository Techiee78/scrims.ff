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

// The caller's Supabase access token: the __supabase_token body field (what the
// app sends), or an Authorization: Bearer header when it carries a Supabase JWT.
export async function getRequestToken(req: Request): Promise<string> {
  let bodyToken = '';
  try {
    const cloned = req.clone();
    const body = await cloned.json();
    if (body && typeof body.__supabase_token === 'string' && body.__supabase_token) {
      bodyToken = body.__supabase_token;
    }
  } catch (_e) {
    // no JSON body — ignore
  }
  if (bodyToken) return bodyToken;

  const authHeader = req.headers.get('Authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

// Verifies the caller's Supabase access token against Supabase Auth and
// returns their identity merged with their public.profiles row, or null.
export async function getUserFromRequest(req: Request): Promise<SupabaseUser | null> {
  try {
    const accessToken = await getRequestToken(req);
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

// ------------------------------------------------------------
// Native MFA (Supabase TOTP / phone factors — no custom OTP)
// ------------------------------------------------------------

// Assurance level carried in the verified access token: 'aal1' (password only)
// or 'aal2' (second factor completed).
export function getTokenAal(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json?.aal === 'string' ? json.aal : null;
  } catch (_e) {
    return null;
  }
}

// True when the account has at least one verified MFA factor enrolled.
// Fails closed to "not enrolled" so a provider hiccup can never lock an admin
// out of the panel; authorization still relies on the database role.
export async function hasVerifiedMfaFactor(supa: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supa.auth.admin.mfa.listFactors({ userId });
    if (error || !data) return false;
    const factors = (data as any).factors || [];
    return factors.some((f: any) => f?.status === 'verified');
  } catch (_e) {
    return false;
  }
}

// ------------------------------------------------------------
// Admin authorization — one fail-closed gate for every privileged action.
// Identity always comes from the verified access token plus the profiles row,
// never from the request body or anything the client can set.
// ------------------------------------------------------------

export type Guard<T> = { ok: true; value: T } | { ok: false; response: Response };

const MFA_REQUIRED_RESPONSE = () =>
  Response.json(
    {
      error:
        'Multi-factor authentication is required for admin actions. Verify your authenticator code and try again.',
      code: 'mfa_required',
    },
    { status: 403 }
  );

// Requires the second factor once the admin has one enrolled (native Supabase
// TOTP/phone only). An account with no factor is unaffected, so an admin can
// never be locked out of the panel by this check alone.
export async function assertAdminMfa(userId: string, token: string): Promise<Guard<true>> {
  const enrolled = await hasVerifiedMfaFactor(serviceClient(), userId);
  if (enrolled && getTokenAal(token) !== 'aal2') {
    return { ok: false, response: MFA_REQUIRED_RESPONSE() };
  }
  return { ok: true, value: true };
}

// 401 when the caller has no valid session, 403 when the session is not an
// admin (re-read from the database on every request, so a demotion takes effect
// immediately), 403 mfa_required for privileged mutations.
export async function requireAdmin(
  req: Request,
  options: { requireMfa?: boolean } = {}
): Promise<Guard<{ admin: SupabaseUser; token: string }>> {
  const token = await getRequestToken(req);
  if (!token) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = await getUserFromRequest(req);
  if (!admin) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (admin.role !== 'admin') {
    return { ok: false, response: Response.json({ error: 'Admins only' }, { status: 403 }) };
  }

  if (options.requireMfa) {
    const mfa = await assertAdminMfa(admin.id, token);
    if (!mfa.ok) return mfa;
  }

  return { ok: true, value: { admin, token } };
}