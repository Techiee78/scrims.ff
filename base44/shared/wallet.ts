// Shared wallet helpers (Supabase) used by backend functions that touch coins.
export const WELCOME_BONUS = 100;

// Returns the player's wallet, creating it (with the welcome bonus) on first use.
// `supa` is a Supabase service-role client.
export async function ensureWallet(supa, userId, email) {
  const { data: existing } = await supa
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing;

  const { data: wallet } = await supa
    .from('wallets')
    .insert({ user_id: userId, user_email: email, balance: WELCOME_BONUS, total_won: 0 })
    .select()
    .single();

  await supa.from('wallet_transactions').insert({
    user_id: userId,
    user_email: email,
    type: 'credit',
    amount: WELCOME_BONUS,
    label: 'Welcome bonus',
    balance_after: WELCOME_BONUS,
  });

  return wallet;
}