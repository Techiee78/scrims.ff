// Shared helpers for the manual coin withdrawal flow:
// player asks for a payout -> admin pays by hand -> approve (debit once) / reject.
// Used by createWithdrawalRequest, getMyWithdrawals and manageWithdrawals.

export const WITHDRAW_MIN = 100;
export const WITHDRAW_MAX = 5000;
export const WITHDRAW_MAX_PENDING = 3;

export const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

// Payout references (UTR) are stored without spaces, upper-case.
export function normalizePayoutRef(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, '').toUpperCase();
}

export function mapWithdrawalError(message: string): { status: number; error: string } {
  const m = String(message || '');
  if (m.includes('invalid_amount'))
    return { status: 400, error: `Enter a whole number between ${WITHDRAW_MIN} and ${WITHDRAW_MAX} coins.` };
  if (m.includes('invalid_upi'))
    return { status: 400, error: 'Enter a valid UPI ID, for example yourname@okaxis.' };
  if (m.includes('invalid_name'))
    return { status: 400, error: 'Enter the name on your UPI account (2 to 60 letters).' };
  if (m.includes('insufficient_balance'))
    return { status: 409, error: 'That is more than your available coin balance.' };
  if (m.includes('no_wallet'))
    return { status: 409, error: 'You have no coin balance to withdraw yet.' };
  if (m.includes('too_many_pending'))
    return { status: 429, error: `You already have ${WITHDRAW_MAX_PENDING} withdrawals waiting for approval.` };
  if (m.includes('request_not_found'))
    return { status: 404, error: 'That withdrawal request does not exist.' };
  if (m.includes('already_decided'))
    return { status: 409, error: 'This request was already decided. Nothing was changed.' };
  if (m.includes('reason_required'))
    return { status: 400, error: 'Add a short reason so the player knows why it was rejected.' };
  if (m.includes('not_admin'))
    return { status: 403, error: 'Admins only.' };
  if (m.includes('invalid_action'))
    return { status: 400, error: 'Unknown decision.' };
  if (m.includes('unknown_admin'))
    return { status: 403, error: 'Admins only.' };
  return { status: 500, error: 'The withdrawal request could not be completed.' };
}