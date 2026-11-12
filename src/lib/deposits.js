import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';

// Manual UPI deposits. The player pays on the admin's UPI QR and submits the
// payment reference; an admin verifies the money and approves or rejects it.
// Coins are only ever credited by the server when an admin approves.

export const COINS_MIN = 10;
export const COINS_MAX = 10000;

async function call(name, payload) {
  const res = await callFunction(name, await withAuth(payload));
  const data = res?.data ?? res;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function fetchMyDeposits() {
  return call('getMyDepositRequests', {});
}

export function submitDepositRequest({ coins, reference, note }) {
  return call('createDepositRequest', { coins, reference, note });
}

export function adminFetchDeposits() {
  return call('manageDeposits', { action: 'list' });
}

export function adminFetchAudit() {
  return call('manageDeposits', { action: 'history' });
}

export function adminDecideDeposit(requestId, action, reason) {
  return call('manageDeposits', { action, request_id: requestId, reason });
}

export function adminSaveUpiSettings({ upiId, payeeName, active }) {
  return call('manageDeposits', { action: 'save_settings', upi_id: upiId, payee_name: payeeName, active });
}

// Standard UPI deep link the QR encodes (amount prefilled).
export function buildUpiLink({ upiId, payeeName, amount }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || 'Scrims.ff',
    am: Number(amount || 0).toFixed(2),
    cu: 'INR',
    tn: `Scrims.ff ${amount} coins`,
  });
  return `upi://pay?${params.toString()}`;
}

export function upiQrUrl(link, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=6&data=${encodeURIComponent(link)}`;
}