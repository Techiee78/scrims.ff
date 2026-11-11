// Shared wallet helpers used by the functions that touch coins.
// Wallets are keyed by user_email (the Supabase auth identity).

// Returns the player's wallet, creating it with a zero balance on first use.
export async function ensureWallet(supa: any, email: string) {
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

// Credits coins to a wallet and records the transaction.
export async function creditCoins(supa: any, email: string, coins: number, label: string) {
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
  await supa.from('wallets').update({ balance: newBalance }).eq('user_email', email);

  await supa.from('wallet_transactions').insert({
    user_email: email,
    type: 'credit',
    amount: Number(coins),
    label: label || 'Coin top-up',
    balance_after: newBalance,
  });

  return { ...current, balance: newBalance };
}

// Credits tournament winnings: adds to the balance AND to total_won, and ties
// the transaction to the match so the same match is never paid twice.
export async function creditWinnings(
  supa: any,
  email: string,
  coins: number,
  label: string,
  tournamentId: number | string
) {
  const amount = Number(coins);
  if (!amount || amount <= 0) return null;

  const current = await ensureWallet(supa, email);
  const newBalance = Number(current.balance || 0) + amount;
  const newWon = Number(current.total_won || 0) + amount;

  await supa.from('wallets').update({ balance: newBalance, total_won: newWon }).eq('user_email', email);

  await supa.from('wallet_transactions').insert({
    user_email: email,
    type: 'credit',
    amount,
    label: label || 'Tournament winnings',
    balance_after: newBalance,
    tournament_id: tournamentId,
  });

  return { ...current, balance: newBalance, total_won: newWon };
}