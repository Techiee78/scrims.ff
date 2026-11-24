import { serviceClient } from '../_shared/supabase.ts';
import { fetchProviderOrder, loadNexupiSettings, normalizeOrderId, settleOrder } from '../_shared/nexupi.ts';

// Webhook URL to paste into the NexUPI dashboard:
//   https://<project-ref>.supabase.co/functions/v1/nexupiWebhook
//
// Nothing in the posted body is trusted for money: only the order id is read,
// and the order is then re-checked with NexUPI before any coins are credited.
// Unknown payloads (or a forged one) therefore cannot add coins, and a repeated
// delivery is a no-op because deposit_order_settle only acts on pending rows.

async function readOrderId(req: Request): Promise<string> {
  const raw = await req.text();
  if (!raw) return '';

  try {
    const json = JSON.parse(raw);
    return normalizeOrderId(json?.order_id ?? json?.orderId ?? json?.order ?? json?.result?.order_id);
  } catch (_e) {
    // form-encoded payload
  }

  try {
    const form = new URLSearchParams(raw);
    return normalizeOrderId(form.get('order_id') || form.get('orderId') || form.get('order'));
  } catch (_e) {
    return '';
  }
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const orderId = await readOrderId(req);
    if (orderId === '') return Response.json({ received: true });

    const supa = serviceClient();

    const { data: order } = await supa
      .from('deposit_requests')
      .select('id, status')
      .eq('provider_order_id', orderId)
      .maybeSingle();

    if (!order || order.status !== 'pending') return Response.json({ received: true });

    const settings = await loadNexupiSettings(supa);
    if (!settings.ready) return Response.json({ received: false, error: 'Payment verification is not configured.' }, { status: 503 });

    const result = await fetchProviderOrder(settings, orderId);
    if (result.state === 'paid') {
      await settleOrder(supa, orderId, 'success', `NexUPI order ${orderId}`);
    } else if (result.state === 'failed') {
      await settleOrder(supa, orderId, 'failure', `NexUPI reported ${result.providerStatus || 'a failed payment'}.`);
    }

    return Response.json({ received: true });
  } catch (_error: any) {
    // Fail visibly so the payment provider can retry transient verification/settlement failures.
    return Response.json({ received: false, error: 'Webhook processing failed; retry later.' }, { status: 503 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));