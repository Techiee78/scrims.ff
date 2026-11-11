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

// supabase/functions/_shared/wallet.ts
async function ensureWallet(supa, email) {
  const { data: existing } = await supa.from("wallets").select("*").eq("user_email", email).maybeSingle();
  if (existing) return existing;
  const { data: wallet } = await supa.from("wallets").insert({ user_email: email, balance: 0, total_won: 0 }).select().single();
  return wallet;
}

// supabase/functions/getWalletOverview/index.ts
async function handler(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const supa = serviceClient();
    const wallet = await ensureWallet(supa, user.email);
    const { data: transactions, error } = await supa.from("wallet_transactions").select("*").eq("user_email", user.email).order("created_at", { ascending: false }).limit(25);
    if (error) throw error;
    const { data: topups } = await supa.from("coin_topups").select("id, order_id, coins, amount_inr, status, mode, payment_id, created_at, updated_at").eq("user_email", user.email).order("created_at", { ascending: false }).limit(10);
    return Response.json({ wallet, transactions: transactions || [], topups: topups || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(handler);
export {
  handler as default
};
