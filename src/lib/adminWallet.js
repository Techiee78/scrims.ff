// Admin-only wallet helpers. Both calls run through the adminWallet Edge
// Function, which verifies the caller's admin role from the database (never
// from client state) and records every adjustment in the audit trail.
import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';

// Every wallet balance, keyed by the user's email.
export async function fetchWalletBalances() {
  const res = await callFunction('adminWallet', await withAuth({ action: 'list' }));
  const data = res?.data ?? res;
  if (data?.error) throw new Error(data.error);

  const map = {};
  (data?.wallets || []).forEach((row) => {
    if (row?.user_email) map[row.user_email] = Number(row.balance || 0);
  });
  return map;
}

// Adds (positive amount) or removes (negative amount) coins; returns the new balance.
export async function adjustCoins(email, amount, note) {
  const res = await callFunction('adminWallet', await withAuth({
    action: 'adjust',
    email,
    coins: amount,
    label: note || '',
  }));
  const data = res?.data ?? res;
  if (data?.error) throw new Error(data.error);
  return Number(data?.balance || 0);
}