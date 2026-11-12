import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';

// Manual coin withdrawals. The player asks for a payout to their own UPI ID;
// an admin pays by hand and approves or rejects it. Coins are only ever debited
// by the server when an admin approves.

export const WITHDRAW_MIN = 100;
export const WITHDRAW_MAX = 5000;

async function call(name, payload) {
  const res = await callFunction(name, await withAuth(payload));
  const data = res?.data ?? res;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function fetchMyWithdrawals() {
  return call('getMyWithdrawals', {});
}

export function submitWithdrawal({ coins, upiId, accountName, note }) {
  return call('createWithdrawalRequest', { coins, upi_id: upiId, account_name: accountName, note });
}

export function adminFetchWithdrawals() {
  return call('manageWithdrawals', { action: 'list' });
}

export function adminFetchWithdrawalAudit() {
  return call('manageWithdrawals', { action: 'history' });
}

export function adminDecideWithdrawal(requestId, action, { reason = '', payoutRef = '' } = {}) {
  return call('manageWithdrawals', {
    action,
    request_id: requestId,
    reason,
    payout_ref: payoutRef,
  });
}