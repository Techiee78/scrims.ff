// Shared wallet helpers (Supabase) used by backend functions that touch coins.
// Wallets are keyed by user_email (Supabase auth identity).
export const WELCOME_BONUS = 100;

// Returns the player's wallet, creating it (with the welcome bonus) on first use.
export async function ensureWallet(supa, email) {
  const { data: existing } = await supa
    .from('wallets')
    .select('*')
    .eq('user_email', email)
    .maybeSingle();
  if (existing) return existing;

  const { data: wallet } = await supa
    .from('wallets')
    .insert({ user_email: email, balance: WELCOME_BONUS, total_won: 0 })
    .select()
    .single();

  await supa.from('wallet_transactions').insert({
    user_email: email,
    type: 'credit',
    amount: WELCOME_BONUS,
    label: 'Welcome bonus',
    balance_after: WELCOME_BONUS,
  });

  return wallet;
}

// Credits coins to a user's wallet and records the transaction.
// Returns the updated wallet row.
export async function creditCoins(supa, email, coins, label) {
  const { data: wallet } = await supa
    .from('wallets')
    .select('*')
    .eq('user_email', email)
    .maybeSingle();

  let current = wallet;
  if (!current) {
    current = await ensureWallet(supa, email);
  }

  const newBalance = (current.balance || 0) + Number(coins);
  await supa
    .from('wallets')
    .update({ balance: newBalance })
    .eq('user_email', email);

  await supa.from('wallet_transactions').insert({
    user_email: email,
    type: 'credit',
    amount: Number(coins),
    label: label || 'Coin top-up',
    balance_after: newBalance,
  });

  return { ...current, balance: newBalance };
}