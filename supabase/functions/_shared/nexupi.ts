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

function isSafeProviderEndpoint(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return false;
    return true;
  } catch (_e) {
    return false;
  }
}
async function postForm(url: string, fields: Record<string, string>) {
  if (!isSafeProviderEndpoint(url)) throw new Error('Payment provider endpoint must be a safe HTTPS URL.');
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
  const found = candidates.find((value) => typeof value === 'string' && isSafeProviderEndpoint(value));
  return found ? String(found) : '';
}

export async function createProviderOrder(
  settings: NexupiSettings,
  orderId: string,
  amount: number,
  redirectUrl?: string
): Promise<string> {
  const fields: Record<string, string> = {
    user_token: settings.token,
    order_id: orderId,
    amount: String(amount),
  };
  // NexUPI appends this to the hosted page, so the player lands back in the app
  // after paying instead of being left on the gateway's own screen.
  if (redirectUrl) fields.redirect_url = redirectUrl;

  const { ok, json } = await postForm(settings.createUrl, fields);

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

  // Real replies look like:
  //   paid      { status: "COMPLETED", result: { txnStatus: "COMPLETED", status: "SUCCESS" } }
  //   in flight { status: "FAILURE",   result: { txnStatus: "FAILURE",   status: "PENDING" } }
  // The top-level status is FAILURE even while a payment is still settling, so
  // only a final failed *result* code may close an order — everything else
  // keeps waiting, and a late success still credits.
  const topStatus = String(json.status ?? '').toUpperCase();
  const txnStatus = String(json.result?.txnStatus ?? json.data?.txnStatus ?? '').toUpperCase();
  const resultStatus = String(json.result?.status ?? json.data?.status ?? '').toUpperCase();
  const providerStatus = resultStatus || txnStatus || topStatus;

  if ([topStatus, txnStatus, resultStatus].some((code) => PAID_CODES.includes(code))) {
    return { state: 'paid', providerStatus };
  }
  if (FAILED_CODES.includes(resultStatus) || (!resultStatus && FAILED_CODES.includes(txnStatus))) {
    return { state: 'failed', providerStatus };
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