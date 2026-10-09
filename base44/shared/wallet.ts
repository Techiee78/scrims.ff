// Shared wallet helpers (Supabase) used by backend functions that touch coins.
// Wallets are keyed by user_email (Supabase auth identity).

// Returns the player's wallet, creating it (with a zero balance) on first use.
export async function ensureWallet(supa, email) {
  const { data: existing } = await supa
    .from('wallets')
    .select('*')
    .eq('user_email', email)
    .maybeSingle();
  if (existing) return existing;

  const { data: wallet } = await supa
    .from('wallets')
    .insert({ user_email: email, balance: 0, total_won: 0 })
    .select()
    .single();

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