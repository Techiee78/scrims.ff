// Admin-only wallet helpers. Both calls run on the admin's own session and the
// database refuses anyone whose profile is not an admin.
import { getSupabase } from '@/lib/supabaseClient';

// Every wallet balance, keyed by the user's email.
export async function fetchWalletBalances() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('admin_list_wallets');
  if (error) throw new Error(error.message || 'Could not load wallet balances');

  const map = {};
  (data || []).forEach((row) => {
    if (row?.user_email) map[row.user_email] = Number(row.balance || 0);
  });
  return map;
}

// Adds (positive amount) or removes (negative amount) coins; returns the new balance.
export async function adjustCoins(email, amount, note) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('admin_adjust_coins', {
    p_user_email: email,
    p_coins: amount,
    p_label: note || null,
  });
  if (error) throw new Error(error.message || 'Could not update the wallet');
  return Number(data || 0);
}