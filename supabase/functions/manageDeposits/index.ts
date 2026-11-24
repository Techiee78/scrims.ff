import { assertAdminMfa, requireAdmin, serviceClient } from '../_shared/supabase.ts';
import { loadUpiSettings, mapDepositError, UPI_ID_RE, UPI_KEY } from '../_shared/deposits.ts';
import { loadNexupiSettings, loadPaymentMode, MODE_KEY, NEXUPI_KEY } from '../_shared/nexupi.ts';

// Admin side of the manual UPI deposits.
//   { action: 'list' }                          -> queue + decided history + UPI settings
//   { action: 'approve', request_id, reason? }  -> credits the wallet exactly once
//   { action: 'reject', request_id, reason }    -> no balance change
//   { action: 'history' }                       -> append-only admin audit log
//   { action: 'save_settings', upi_id, payee_name, active }
export default async function handler(req: Request): Promise<Response> {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;
    const { admin, token: adminToken } = guard.value;

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const supa = serviceClient();
    const action = body?.action || 'list';

    // Deposit queue/history contains payment references; require MFA for all actions.
    const mfa = await assertAdminMfa(admin.id, adminToken);
    if (!mfa.ok) return mfa.response;

    if (action === 'list') {
      const settings = await loadUpiSettings(supa);
      const mode = await loadPaymentMode(supa);
      const nexupi = await loadNexupiSettings(supa);
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/nexupiWebhook`;

      const { data: pending, error: pendingError } = await supa
        .from('deposit_requests')
        .select('id, user_id, user_email, coins, amount_inr, reference, payer_note, provider, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(200);
      if (pendingError) return Response.json({ error: pendingError.message }, { status: 500 });

      const { data: decided, error: decidedError } = await supa
        .from('deposit_requests')
        .select('id, user_id, user_email, coins, amount_inr, reference, provider, status, created_at')
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(40);
      if (decidedError) return Response.json({ error: decidedError.message }, { status: 500 });

      const decidedIds = (decided || []).map((r: any) => r.id);
      let decisions: any[] = [];
      if (decidedIds.length > 0) {
        const { data } = await supa
          .from('deposit_decisions')
          .select('request_id, action, reason, admin_email, balance_after, created_at')
          .in('request_id', decidedIds);
        decisions = data || [];
      }
      const decisionByRequest: Record<string, any> = {};
      for (const d of decisions) decisionByRequest[d.request_id] = d;

      const userIds = [...new Set([...(pending || []), ...(decided || [])].map((r: any) => r.user_id).filter(Boolean))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supa
          .from('profiles')
          .select('id, full_name, ff_ign, email')
          .in('id', userIds);
        profiles = data || [];
      }
      const profileById: Record<string, any> = {};
      for (const p of profiles) profileById[p.id] = p;

      const decorate = (r: any) => ({
        ...r,
        player: profileById[r.user_id] || null,
        decision: decisionByRequest[r.id] || null,
      });

      return Response.json({
        settings: { ...settings, mode, nexupiReady: nexupi.ready },
        nexupi: {
          tokenSet: nexupi.token !== '',
          createUrl: nexupi.createUrl,
          statusUrl: nexupi.statusUrl,
          ready: nexupi.ready,
        },
        webhookUrl,
        pending: (pending || []).map(decorate),
        decided: (decided || []).map(decorate),
      });
    }

    if (action === 'approve' || action === 'reject') {
      const requestId = String(body?.request_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
        return Response.json({ error: 'A valid request is required.' }, { status: 400 });
      }

      const { data, error } = await supa.rpc('deposit_request_decide', {
        p_admin_id: admin.id,
        p_request_id: requestId,
        p_action: action,
        p_reason: String(body?.reason || '').slice(0, 200),
      });

      if (error) {
        const mapped = mapDepositError(error.message);
        return Response.json({ error: mapped.error }, { status: mapped.status });
      }
      return Response.json({ result: data });
    }

    if (action === 'history') {
      const { data, error } = await supa
        .from('admin_audit_log')
        .select('id, actor_email, action, entity, entity_id, target_email, details, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ entries: data || [] });
    }

    if (action === 'save_settings') {
      const upiId = String(body?.upi_id || '').trim();
      const payeeName = String(body?.payee_name || '').trim().slice(0, 60) || 'Scrims.ff';
      const active = body?.active === true;

      if (upiId !== '' && !UPI_ID_RE.test(upiId)) {
        return Response.json(
          { error: 'Enter a valid UPI ID, for example scrimsff@okaxis.' },
          { status: 400 },
        );
      }
      if (active && upiId === '') {
        return Response.json({ error: 'Add your UPI ID before turning payments on.' }, { status: 400 });
      }

      const { error } = await supa
        .from('app_settings')
        .upsert({ key: UPI_KEY, value: { upi_id: upiId, payee_name: payeeName, active } }, { onConflict: 'key' });
      if (error) return Response.json({ error: error.message }, { status: 500 });

      await supa.from('admin_audit_log').insert({
        actor_id: admin.id,
        actor_email: admin.email,
        action: 'settings.update',
        entity: 'app_settings',
        details: { key: UPI_KEY, upi_id: upiId, payee_name: payeeName, active },
      });

      return Response.json({ settings: { upiId, payeeName, active: active && upiId !== '' } });
    }

    if (action === 'save_mode') {
      const mode = body?.mode === 'automatic' ? 'automatic' : body?.mode === 'manual' ? 'manual' : '';
      if (mode === '') {
        return Response.json({ error: 'Choose Manual or Automatic.' }, { status: 400 });
      }
      if (mode === 'automatic') {
        const nexupi = await loadNexupiSettings(supa);
        if (!nexupi.ready) {
          return Response.json(
            { error: 'Add your NexUPI API token and both endpoint URLs before switching to Automatic.' },
            { status: 400 },
          );
        }
      }

      const { error } = await supa
        .from('app_settings')
        .upsert({ key: MODE_KEY, value: { mode } }, { onConflict: 'key' });
      if (error) return Response.json({ error: error.message }, { status: 500 });

      await supa.from('admin_audit_log').insert({
        actor_id: admin.id,
        actor_email: admin.email,
        action: 'settings.update',
        entity: 'app_settings',
        details: { key: MODE_KEY, mode },
      });

      return Response.json({ mode });
    }

    if (action === 'save_nexupi') {
      const existing = await loadNexupiSettings(supa);
      const typedToken = String(body?.token || '').trim();
      const token = typedToken || existing.token;
      const createUrl = String(body?.create_url || '').trim();
      const statusUrl = String(body?.status_url || '').trim();

      for (const [label, url] of [
        ['Create order URL', createUrl],
        ['Check order status URL', statusUrl],
      ]) {
        if (url !== '' && !/^https:\/\/[^\s]+$/i.test(url)) {
          return Response.json({ error: `${label} must be a full https:// link.` }, { status: 400 });
        }
      }

      const ready = token !== '' && createUrl !== '' && statusUrl !== '';

      const { error } = await supa
        .from('app_settings')
        .upsert(
          { key: NEXUPI_KEY, value: { token, create_url: createUrl, status_url: statusUrl } },
          { onConflict: 'key' },
        );
      if (error) return Response.json({ error: error.message }, { status: 500 });

      await supa.from('admin_audit_log').insert({
        actor_id: admin.id,
        actor_email: admin.email,
        action: 'settings.update',
        entity: 'app_settings',
        details: {
          key: NEXUPI_KEY,
          token_set: token !== '',
          create_url: createUrl,
          status_url: statusUrl,
        },
      });

      return Response.json({
        nexupi: { tokenSet: token !== '', createUrl, statusUrl, ready },
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (_error: any) {
    return Response.json({ error: 'The request could not be completed.' }, { status: 500 });
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));