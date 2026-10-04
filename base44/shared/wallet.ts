// Shared wallet helpers used by every backend function that touches coins.
export const WELCOME_BONUS = 100;

// Returns the player's wallet, creating it (with the welcome bonus) on first use.
export async function ensureWallet(base44, email) {
  const existing = await base44.asServiceRole.entities.Wallet.filter({ user_email: email });
  if (existing && existing.length > 0) return existing[0];

  const wallet = await base44.asServiceRole.entities.Wallet.create({
    user_email: email,
    balance: WELCOME_BONUS,
    total_won: 0
  });

  await base44.asServiceRole.entities.WalletTransaction.create({
    user_email: email,
    type: 'credit',
    amount: WELCOME_BONUS,
    label: 'Welcome bonus',
    balance_after: WELCOME_BONUS
  });

  return wallet;
}