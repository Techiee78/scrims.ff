import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';

// TEST MODE recharge — simulated only. The server decides whether the signed-in
// account may use it; the client never sends a user id, an amount, or a
// "success" flag that could credit a wallet.

export async function createTestRecharge(coins) {
  const res = await callFunction('createTestRecharge', await withAuth({ coins }));
  return res?.data ?? res;
}

export async function simulateTestRecharge(orderId, outcome) {
  const res = await callFunction('simulateTestRecharge', await withAuth({ orderId, outcome }));
  return res?.data ?? res;
}