import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';

// Automatic (instant UPI) coin top-ups. The admin picks the payment mode for
// the whole app in the admin panel; the server owns the order and the credit.

async function call(name, payload) {
  const res = await callFunction(name, await withAuth(payload));
  const data = res?.data ?? res;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function startInstantPayment(coins, returnUrl) {
  return call('createNexupiOrder', { coins, return_url: returnUrl });
}

export function checkInstantPayment(orderId) {
  return call('checkNexupiOrder', { order_id: orderId });
}

export function adminSavePaymentMode(mode) {
  return call('manageDeposits', { action: 'save_mode', mode });
}

export function adminSaveNexupiSettings({ token, createUrl, statusUrl }) {
  return call('manageDeposits', {
    action: 'save_nexupi',
    token,
    create_url: createUrl,
    status_url: statusUrl,
  });
}