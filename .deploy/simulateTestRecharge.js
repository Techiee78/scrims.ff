// supabase/functions/_shared/supabase.ts
import { createClient } from "npm:@supabase/supabase-js@2";
function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
async function getUserFromRequest(req) {
  try {
    let bodyToken = null;
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      if (body && typeof body.__supabase_token === "string" && body.__supabase_token) {
        bodyToken = body.__supabase_token;
      }
    } catch (_e) {
    }
    const authHeader = req.headers.get("Authorization") || "";
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const accessToken = bodyToken || headerToken;
    if (!accessToken) return null;
    const supa = serviceClient();
    const { data: authData, error: authError } = await supa.auth.getUser(accessToken);
    if (authError || !authData?.user) return null;
    const u = authData.user;
    let profile = null;
    try {
      const { data: p } = await supa.from("profiles").select("*").eq("id", u.id).maybeSingle();
      profile = p;
    } catch (_e) {
    }
    return {
      id: u.id,
      email: u.email || profile?.email || "",
      full_name: profile?.full_name || u.user_metadata?.full_name || "",
      role: profile?.role || "user",
      ff_ign: profile?.ff_ign || "",
      ff_uid: profile?.ff_uid || "",
      whatsapp: profile?.whatsapp || ""
    };
  } catch (_e) {
    return null;
  }
}

// supabase/functions/_shared/testMode.ts
function testModeGate(user) {
  const signals = [Deno.env.get("PAYMENTS_ENV"), Deno.env.get("CASHFREE_ENV")].filter(Boolean).map((v) => String(v).trim().toLowerCase());
  if (signals.some((v) => ["prod", "production", "live"].includes(v))) {
    return { ok: false, status: 403, error: "Test recharge is switched off in production." };
  }
  const allowlist = (Deno.env.get("TEST_RECHARGE_ALLOWLIST") || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "Test recharge is not configured on the server."
    };
  }
  const email = (user.email || "").trim().toLowerCase();
  if (!email || !allowlist.includes(email)) {
    return { ok: false, status: 403, error: "Test recharge is limited to allowlisted test accounts." };
  }
  return { ok: true };
}
function mapTopupError(message) {
  const m = String(message || "");
  if (m.includes("order_not_found")) return { status: 404, error: "That test order does not exist." };
  if (m.includes("not_your_order")) return { status: 403, error: "That test order belongs to another account." };
  if (m.includes("not_a_test_order")) return { status: 403, error: "That order is not a test order." };
  if (m.includes("invalid_order_state"))
    return { status: 409, error: "That test order is already finalised." };
  if (m.includes("invalid_amount"))
    return { status: 400, error: "Test recharge must be between 10 and 10,000 coins." };
  return { status: 500, error: "The test recharge could not be completed." };
}

// supabase/functions/simulateTestRecharge/index.ts
async function handler(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const gate = testModeGate(user);
    if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
    let body = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    const outcome = body?.outcome;
    if (!orderId) return Response.json({ error: "Missing test order." }, { status: 400 });
    if (outcome !== "success" && outcome !== "failure") {
      return Response.json({ error: "Pick a test outcome." }, { status: 400 });
    }
    const supa = serviceClient();
    const call = outcome === "success" ? supa.rpc("wallet_test_topup_confirm", { p_user_id: user.id, p_order_id: orderId }) : supa.rpc("wallet_test_topup_fail", { p_user_id: user.id, p_order_id: orderId });
    const { data, error } = await call;
    if (error) {
      const mapped = mapTopupError(error.message);
      return Response.json({ error: mapped.error }, { status: mapped.status });
    }
    return Response.json({ testMode: true, ...data || {} });
  } catch (error) {
    return Response.json({ error: "The test recharge could not be completed." }, { status: 500 });
  }
}
Deno.serve(handler);
export {
  handler as default
};
