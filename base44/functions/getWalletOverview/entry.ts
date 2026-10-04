import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ensureWallet } from '../../shared/wallet.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const wallet = await ensureWallet(base44, user.email);
    const transactions = await base44.asServiceRole.entities.WalletTransaction.filter(
      { user_email: user.email },
      '-created_date',
      25
    );

    return Response.json({ wallet, transactions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}