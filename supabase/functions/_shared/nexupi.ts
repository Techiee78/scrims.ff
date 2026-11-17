// Shared helpers for the automatic (NexUPI) coin top-up flow.
//
// NexUPI contract, as documented on their merchant Developers page:
//   * every request carries the merchant `user_token`;
//   * create order   — POST application/x-www-form-urlencoded with
//                      user_token, order_id, amount -> returns payment_url;
//   * check status   — POST with user_token, order_id;
//   * a successful order answers status COMPLETED with result.status SUCCESS;
//   * NexUPI also POSTs the final status to the configured Webhook URL.
// Orders expire after 30 minutes.
//
// The token and both endpoint URLs are admin settings (app_settings, readable
// by the service role only) because the exact URLs come from that page.

export const MODE_KEY = 'payment_mode';
export const NEXUPI_KEY = 'nexupi';

export type PaymentMode = 'manual' | 'automatic';

export type NexupiSettings = {
  token: string;
  createUrl: string;
  statusUrl: string;
  ready: boolean;
};

export async function loadPaymentMode(supa: any): Promise<PaymentMode> {
  const { data } = await supa
    .from('app_settings')
    .select('value')
    .eq('key', MODE_KEY)
    .maybeSingle();

  return (data?.value as any)?.mode === 'automatic' ? 'automatic' : 'manual';
}

export async function loadNexupiSettings(supa: any): Promise<NexupiSettings> {
  const { data } = await supa
    .from('app_settings')
    .select('value')
    .eq('key', NEXUPI_KEY)
    .maybeSingle();

  const value = (data?.value || {}) as Record<string, unknown>;
  const read = (key: string) => (typeof value[key] === 'string' ? String(value[key]).trim() : '');

  const token = read('token');
  const createUrl = read('create_url');
  const statusUrl = read('status_url');

  return { token, createUrl, statusUrl, ready: token !== '' && createUrl !== '' && statusUrl !== '' };
}

// NexUPI only needs an id that is unique per order and short enough to carry
// into a UPI reference: SF + base36 time + 4 random characters.
export function generateOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SF${stamp}${rand}`;
}

export function normalizeOrderId(raw: unknown): string {
  return String(raw ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

async function postForm(url: string, fields: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch (_e) {
    json = null;
  }

  return { ok: res.ok, json };
}

// The create-order reply carries the hosted payment page as `payment_url`.
function pickPaymentUrl(json: any): string {
  if (!json || typeof json !== 'object') return '';
  const candidates = [
    json.payment_url,
    json.result?.payment_url,
    json.data?.payment_url,
    json.result?.url,
    json.data?.url,
    json.url,
  ];
  const found = candidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(value));
  return found ? String(found) : '';
}

export async function createProviderOrder(
  settings: NexupiSettings,
  orderId: string,
  amount: number
): Promise<string> {
  const { ok, json } = await postForm(settings.createUrl, {
    user_token: settings.token,
    order_id: orderId,
    amount: String(amount),
  });

  const paymentUrl = pickPaymentUrl(json);
  if (!ok || !paymentUrl) {
    throw new Error('The UPI gateway did not return a payment page.');
  }
  return paymentUrl;
}

const FAILED_CODES = ['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED', 'DECLINED'];
const PAID_CODES = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'];

export type OrderState = { state: 'paid' | 'failed' | 'pending' | 'unknown'; providerStatus: string };

export async function fetchProviderOrder(settings: NexupiSettings, orderId: string): Promise<OrderState> {
  const { ok, json } = await postForm(settings.statusUrl, {
    user_token: settings.token,
    order_id: orderId,
  });

  if (!ok || !json) return { state: 'unknown', providerStatus: '' };

  const orderStatus = String(json.status ?? '').toUpperCase();
  const resultStatus = String(json.result?.status ?? json.data?.status ?? '').toUpperCase();
  const providerStatus = resultStatus || orderStatus;

  if (FAILED_CODES.includes(resultStatus) || FAILED_CODES.includes(orderStatus)) {
    return { state: 'failed', providerStatus };
  }
  if (PAID_CODES.includes(resultStatus) || PAID_CODES.includes(orderStatus)) {
    return { state: 'paid', providerStatus };
  }
  return { state: 'pending', providerStatus };
}

// Credits / closes the order through the atomic database RPC.
export async function settleOrder(supa: any, orderId: string, outcome: 'success' | 'failure', note?: string) {
  const { data, error } = await supa.rpc('deposit_order_settle', {
    p_order_id: orderId,
    p_outcome: outcome,
    p_note: note || null,
  });
  if (error) throw new Error(error.message);
  return data;
}