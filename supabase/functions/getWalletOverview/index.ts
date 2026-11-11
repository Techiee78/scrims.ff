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
      .select('*')
      .eq('user_email', user.email)
      .order('created_at', { ascending: false })
      .limit(25);
    if (error) throw error;
    return Response.json({ wallet, transactions: transactions || [] });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

Deno.serve(handler);