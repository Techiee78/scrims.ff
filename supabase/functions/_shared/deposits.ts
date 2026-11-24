// Shared helpers for the manual UPI deposit flow:
// player submits a request -> admin verifies the bank payment -> approve/reject.
// Used by createDepositRequest, getMyDepositRequests and manageDeposits.

export const COINS_MIN = 10;
export const COINS_MAX = 500;
export const MAX_PENDING = 3;
export const UPI_KEY = 'upi_payment';

// One player can add at most ₹5,000 (coins are 1:1 with rupees) in a day.
// The day is counted in IST and includes payments still waiting to settle.
export const DAILY_DEPOSIT_LIMIT = 5000;

function startOfIstDay(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const dayStart = Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return new Date(dayStart).toISOString();
}

// Coins added today: pending and approved count, rejected ones do not.
export async function dailyDepositTotal(supa: any, userId: string): Promise<number> {
  const { data } = await supa
    .from('deposit_requests')
    .select('coins, status')
    .eq('user_id', userId)
    .gte('created_at', startOfIstDay());
  return (data || [])
    .filter((row: any) => row.status === 'pending' || row.status === 'approved')
    .reduce((sum: number, row: any) => sum + Number(row.coins || 0), 0);
}

// Returns the error to send back when this payment would cross the daily cap.
export async function dailyLimitError(
  supa: any,
  userId: string,
  coins: number,
): Promise<{ status: number; error: string } | null> {
  const used = await dailyDepositTotal(supa, userId);
  if (used + coins <= DAILY_DEPOSIT_LIMIT) return null;
  const left = Math.max(0, DAILY_DEPOSIT_LIMIT - used);
  return {
    status: 429,
    error:
      left > 0
        ? `Only ₹${DAILY_DEPOSIT_LIMIT} can be added in a day. You can add ₹${left} more today.`
        : `You have reached today's ₹${DAILY_DEPOSIT_LIMIT} deposit limit. Try again tomorrow.`,
  };
}

export type UpiSettings = { upiId: string; payeeName: string; active: boolean };

// A UPI reference (UTR) is always exactly 12 digits: everything else the player
// types (spaces, dashes) is dropped so one payment can never be submitted twice.
export const REFERENCE_LENGTH = 12;

export function normalizeReference(raw: unknown): string {
  return String(raw ?? '').replace(/\D/g, '');
}

export const REFERENCE_RE = /^\d{12}$/;
export const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

// The admin's collection account, read from app_settings (service role only).
export async function loadUpiSettings(supa: any): Promise<UpiSettings> {
  const { data } = await supa
    .from('app_settings')
    .select('value')
    .eq('key', UPI_KEY)
    .maybeSingle();

  const value = (data?.value || {}) as Record<string, unknown>;
  const upiId = typeof value.upi_id === 'string' ? value.upi_id.trim() : '';
  const payeeName =
    typeof value.payee_name === 'string' && value.payee_name.trim()
      ? value.payee_name.trim()
      : 'Scrims.ff';

  return { upiId, payeeName, active: value.active === true && upiId !== '' };
}

// Maps a database error into a safe client message + status.
export function mapDepositError(message: string): { status: number; error: string } {
  const m = String(message || '');
  if (m.includes('duplicate_reference'))
    return { status: 409, error: 'This UPI reference is already used by another request.' };
  if (m.includes('invalid_amount'))
    return { status: 400, error: `Enter a whole number between ${COINS_MIN} and ${COINS_MAX} coins.` };
  if (m.includes('invalid_reference'))
    return { status: 400, error: 'Enter the 12-digit UTR from your payment app.' };
  if (m.includes('too_many_pending'))
    return { status: 429, error: `You already have ${MAX_PENDING} requests waiting for approval.` };
  if (m.includes('daily_limit_exceeded'))
    return { status: 429, error: 'You have reached the daily deposit limit. Try again tomorrow or lower the amount.' };
  if (m.includes('request_not_found'))
    return { status: 404, error: 'That deposit request does not exist.' };
  if (m.includes('already_decided'))
    return { status: 409, error: 'This request was already decided. Nothing was changed.' };
  if (m.includes('reason_required'))
    return { status: 400, error: 'Add a short reason so the player knows why it was rejected.' };
  if (m.includes('not_admin'))
    return { status: 403, error: 'Admins only.' };
  if (m.includes('invalid_action'))
    return { status: 400, error: 'Unknown decision.' };
  if (m.includes('unauthorized'))
    return { status: 401, error: 'Please sign in again.' };
  return { status: 500, error: 'The deposit request could not be completed.' };
}