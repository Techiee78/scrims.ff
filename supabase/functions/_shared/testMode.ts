// Shared gate for the TEST-MODE wallet recharge simulator.
//
// Fails closed:
//   * any production signal in the environment disables the simulator;
//   * an empty/unset allowlist disables the simulator;
//   * only emails on the allowlist may use it.
// The allowlist is a server-side secret (TEST_RECHARGE_ALLOWLIST), never
// supplied by the client.

export type GateResult = { ok: true } | { ok: false; status: number; error: string };

export function testModeGate(user: { email?: string | null }): GateResult {
  const signals = [Deno.env.get('PAYMENTS_ENV'), Deno.env.get('CASHFREE_ENV')]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());

  if (signals.some((v) => ['prod', 'production', 'live'].includes(v))) {
    return { ok: false, status: 403, error: 'Test recharge is switched off in production.' };
  }

  const allowlist = (Deno.env.get('TEST_RECHARGE_ALLOWLIST') || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return {
      ok: false,
      status: 503,
      error: 'Test recharge is not configured on the server.',
    };
  }

  const email = (user.email || '').trim().toLowerCase();
  if (!email || !allowlist.includes(email)) {
    return { ok: false, status: 403, error: 'Test recharge is limited to allowlisted test accounts.' };
  }

  return { ok: true };
}

// Maps a database error into a safe client message + status.
export function mapTopupError(message: string): { status: number; error: string } {
  const m = String(message || '');
  if (m.includes('order_not_found')) return { status: 404, error: 'That test order does not exist.' };
  if (m.includes('not_your_order')) return { status: 403, error: 'That test order belongs to another account.' };
  if (m.includes('not_a_test_order')) return { status: 403, error: 'That order is not a test order.' };
  if (m.includes('invalid_order_state'))
    return { status: 409, error: 'That test order is already finalised.' };
  if (m.includes('invalid_amount'))
    return { status: 400, error: 'Test recharge must be between 10 and 10,000 coins.' };
  return { status: 500, error: 'The test recharge could not be completed.' };
}