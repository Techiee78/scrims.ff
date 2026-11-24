import { assertAdminMfa, requireAdmin, serviceClient } from '../_shared/supabase.ts';

// Admin-only user management.
//   { action: 'list' }
//   { action: 'profile', user_id }
//   { action: 'update', user_id, role }   role change (demote / promote)
//   { action: 'transfer', user_id }       hand admin access to user_id
//
// Role changes never touch the table directly: they go through the
// SECURITY DEFINER RPCs in migration 0022, so the database itself enforces the
// single-admin policy and writes the audit trail. Denied attempts are logged
// here because a rolled-back transaction cannot record them.
export default async function handler(req: Request): Promise<Response> {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.response;
    const { admin: user, token } = guard.value;

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const supa = serviceClient();

    if (body.action === 'list' || !body.action) {
      const { data, error } = await supa
        .from('profiles')
        .select('id, email, full_name, role, ff_ign, ff_uid, whatsapp, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ users: data || [] });
    }

    // Full player profile + joined registrations, for the admin profile view.
    if (body.action === 'profile') {
      const targetId = body.user_id;
      if (!targetId || typeof targetId !== 'string') {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }
      const { data: profile, error: profileError } = await supa
        .from('profiles')
        .select('id, email, full_name, role, ff_ign, ff_uid, whatsapp, created_at')
        .eq('id', targetId)
        .maybeSingle();
      if (profileError) return Response.json({ error: profileError.message }, { status: 500 });
      if (!profile) return Response.json({ error: 'User not found' }, { status: 404 });

      const { data: registrations, error: regError } = await supa
        .from('registrations')
        .select('*')
        .eq('user_email', profile.email)
        .eq('status', 'joined')
        .order('created_at', { ascending: false })
        .limit(60);
      if (regError) return Response.json({ error: regError.message }, { status: 500 });

      return Response.json({ profile, registrations: registrations || [] });
    }

    if (body.action === 'update' || body.action === 'transfer') {
      // Native MFA: once the admin has an authenticator enrolled, role changes
      // require the second factor (aal2 token). No custom OTP is involved.
      const mfa = await assertAdminMfa(user.id, token);
      if (!mfa.ok) return mfa.response;

      const targetId = body.user_id;
      if (!targetId || typeof targetId !== 'string') {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }

      const { data: target, error: targetError } = await supa
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', targetId)
        .maybeSingle();
      if (targetError) return Response.json({ error: targetError.message }, { status: 500 });
      if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

      const rpc =
        body.action === 'transfer'
          ? { name: 'admin_transfer_admin', args: { p_actor_id: user.id, p_actor_email: user.email, p_target_id: targetId } }
          : { name: 'admin_set_user_role', args: { p_actor_id: user.id, p_actor_email: user.email, p_target_id: targetId, p_new_role: body.role } };

      const { data, error } = await supa.rpc(rpc.name, rpc.args);

      if (error) {
        const mapped = mapRoleError(error.message);
        await logDeniedRoleChange(supa, {
          actor: user,
          target,
          newRole: body.action === 'transfer' ? 'admin' : body.role,
          action: body.action === 'transfer' ? 'user.role_transfer_denied' : 'user.role_change_denied',
          reason: error.message,
        });
        return Response.json({ error: mapped.error }, { status: mapped.status });
      }

      // The database trigger already wrote the applied change to the audit log.
      if (body.action === 'transfer') {
        return Response.json({ transfer: data });
      }
      return Response.json({
        user: {
          id: target.id,
          email: target.email,
          full_name: target.full_name,
          role: body.role,
        },
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: 'The request could not be completed.' }, { status: 500 });
  }
}

function mapRoleError(message: string): { error: string; status: number } {
  const m = String(message || '');
  if (m.includes('single_admin_policy')) {
    return {
      error: 'Only one admin is allowed. Transfer admin access instead of adding a second admin.',
      status: 409,
    };
  }
  if (m.includes('last_admin_protected')) {
    return { error: 'The only admin cannot be demoted.', status: 409 };
  }
  if (m.includes('self_demotion_blocked')) {
    return { error: 'You cannot remove your own admin role.', status: 400 };
  }
  if (m.includes('actor_not_admin')) {
    return { error: 'Admins only', status: 403 };
  }
  if (m.includes('invalid_target') || m.includes('invalid_role')) {
    return { error: 'Invalid role change request.', status: 400 };
  }
  if (m.includes('user_not_found')) {
    return { error: 'User not found', status: 404 };
  }
  return { error: 'The role change could not be completed.', status: 500 };
}

// A refused role change rolls back its transaction, so it has to be recorded
// separately from the database trigger that logs applied changes.
async function logDeniedRoleChange(
  supa: any,
  params: {
    actor: { id: string; email: string };
    target: { id: string; email: string | null; role: string | null };
    newRole: string | null;
    action: string;
    reason: string;
  }
) {
  try {
    await supa.from('admin_audit_log').insert({
      actor_id: params.actor.id,
      actor_email: params.actor.email,
      action: params.action,
      entity: 'profile',
      entity_id: params.target.id,
      target_email: params.target.email,
      details: {
        old_role: params.target.role,
        new_role: params.newRole,
        outcome: 'denied',
        reason: params.reason,
        source: 'edge_function',
      },
    });
  } catch (_e) {
    // Never let audit bookkeeping change the response.
  }
}

import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(handler));