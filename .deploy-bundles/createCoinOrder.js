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

// supabase/functions/createCoinOrder/index.ts
async function handler(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const appId = Deno.env.get("CASHFREE_APP_ID");
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    const env = (Deno.env.get("CASHFREE_ENV") || "PROD").toUpperCase();
    if (!appId || !secretKey) {
      return Response.json({ configured: false, message: "Payments are not configured yet." });
    }
    let body = {};
    try {
      body = await req.json();
    } catch (_e) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const coins = Number(body?.coins);
    if (!Number.isInteger(coins) || coins <= 0) {
      return Response.json({ error: "Invalid coin amount" }, { status: 400 });
    }
    const returnOrigin = typeof body?.returnOrigin === "string" && /^https?:\/\/[^/\s]+$/.test(body.returnOrigin) ? body.returnOrigin : "https://scrim-fire-hub.base44.app";
    const amountInr = coins.toFixed(2);
    const orderId = `coins_${user.id}_${Date.now()}`;
    const baseUrl = env === "TEST" ? "https://sandbox.cashfree.com" : "https://api.cashfree.com";
    const apiVersion = "2023-08-01";
    const supa = serviceClient();
    const { error: saveError } = await supa.from("coin_topups").insert({
      user_email: user.email,
      coins,
      amount_inr: coins,
      order_id: orderId,
      status: "created"
    });
    if (saveError) {
      return Response.json({ error: "Top-ups are temporarily unavailable. Please try again later." }, { status: 503 });
    }
    const res = await fetch(`${baseUrl}/pg/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": apiVersion
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amountInr),
        order_currency: "INR",
        customer_details: {
          customer_id: user.id,
          customer_email: user.email,
          customer_phone: "9999999999",
          customer_name: user.full_name || user.email
        },
        order_meta: { return_url: `${returnOrigin}/wallet?order_id=${orderId}` },
        order_note: `${coins} coins top-up \xB7 Scrims.ff`
      }),
      signal: AbortSignal.timeout(12e3)
    });
    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: "Cashfree order failed", details: errText }, { status: 502 });
    }
    const order = await res.json();
    return Response.json({
      configured: true,
      orderId,
      paymentSessionId: order.payment_session_id,
      amount: Number(amountInr),
      currency: "INR",
      env,
      appId,
      coins
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(handler);
export {
  handler as default
};
