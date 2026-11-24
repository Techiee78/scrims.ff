import { assertAdminMfa, requireAdmin, serviceClient } from '../_shared/supabase.ts';

// Admin wallet operations.
//
// These used to be called straight from the browser against SECURITY DEFINER
// RPCs. They now run here so every adjustment is authorised once (verified
// token + database role), MFA-gated and written to the audit trail — and the
// RPCs themselves are no longer executable by app users.
//
//   { action: 'list' }                          -> every wallet balance
//   { action: 'adjust', email, coins, label? }  -> the new balance
export default async function handler(req: Request): Promise<Response> {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;
    const { admin, token } = guard.value;

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const supa = serviceClient();
    const action = body?.action || 'list';

    // Wallet balances are sensitive financial data; require MFA for reads and writes.
    const mfa = await assertAdminMfa(admin.id, token);
    if (!mfa.ok) return mfa.response;

    if (action === 'list') {
      const { data, error } = await supa.rpc('admin_wallet_list', { p_actor_id: admin.id });
      if (error) return Response.json({ error: 'Could not load wallet balances' }, { status: 500 });
      return Response.json({ wallets: data || [] });
    }

    if (action === 'adjust') {

      const email = String(body?.email || '').trim();
      const coins = Math.floor(Number(body?.coins));
      const label = String(body?.label || '').trim().slice(0, 120);

      if (!email || !email.includes('@')) {
        return Response.json({ error: 'A player email is required.' }, { status: 400 });
      }
      if (!Number.isFinite(coins) || coins === 0) {
        return Response.json({ error: 'Enter a coin amount.' }, { status: 400 });
      }

      const { data, error } = await supa.rpc('admin_wallet_adjust', {
        p_actor_id: admin.id,
        p_actor_email: admin.email,
        p_user_email: email,
        p_coins: coins,
        p_label: label || null,
      });

      if (error) {
        if (String(error.message || '').includes('Admins only')) {
          return Response.json({ error: 'Admins only' }, { status: 403 });
        }
        return Response.json({ error: 'Could not update the wallet' }, { status: 500 });
      }

      return Response.json({ balance: Number(data || 0) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (_error: any) {
    return Response.json({ error: 'The request could not be completed.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));