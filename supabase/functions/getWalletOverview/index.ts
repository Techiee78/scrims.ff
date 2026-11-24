import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';
import { ensureWallet } from '../_shared/wallet.ts';

// Returns the current user's wallet + recent transactions.
export default async function handler(req: Request): Promise<Response> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const supa = serviceClient();
    const wallet = await ensureWallet(supa, user.email);
    const { data: transactions, error } = await supa
      .from('wallet_transactions')
      .select('id, type, amount, label, balance_after, tournament_id, topup_order_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25);
    if (error) throw error;

    // The player's own recharge orders (read server-side; clients can only
    // SELECT their own rows via RLS).
    const { data: topups } = await supa
      .from('coin_topups')
      .select('id, order_id, coins, amount_inr, status, mode, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return Response.json({ wallet, transactions: transactions || [], topups: topups || [] });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));