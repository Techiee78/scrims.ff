import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { serviceClient } from '../../shared/supabase.ts';
import { ensureWallet } from '../../shared/wallet.ts';

// Returns the current user's wallet + recent transactions.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}