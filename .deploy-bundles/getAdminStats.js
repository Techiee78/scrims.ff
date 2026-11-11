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

// supabase/functions/getAdminStats/index.ts
async function handler(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
    const supa = serviceClient();
    const { data: tours } = await supa.from("tournaments").select("*").order("created_at", { ascending: false }).limit(500);
    const { data: regs } = await supa.from("registrations").select("user_email, tournament_id").eq("status", "joined").limit(5e3);
    const { data: wallets } = await supa.from("wallets").select("balance").limit(5e3);
    const tournaments = tours || [];
    const registrations = regs || [];
    const w = wallets || [];
    const now = Date.now();
    const isLive = (t) => t.status !== "completed" && !!t.match_time && new Date(t.match_time).getTime() <= now;
    const isUpcoming = (t) => t.status !== "completed" && !isLive(t);
    const joinedByTournament = {};
    registrations.forEach((r) => {
      if (!r.tournament_id) return;
      joinedByTournament[r.tournament_id] = (joinedByTournament[r.tournament_id] || 0) + 1;
    });
    const liveMatches = tournaments.filter(isLive).map((t) => ({
      id: t.id,
      title: t.title,
      mode: t.mode,
      team_type: t.team_type,
      map: t.map,
      match_time: t.match_time,
      total_slots: Number(t.total_slots || 0),
      joined: joinedByTournament[t.id] || 0,
      entry_fee: Number(t.entry_fee || 0),
      prize_pool: Number(t.prize_pool || 0)
    }));
    return Response.json({
      tournaments: tournaments.length,
      live: liveMatches.length,
      upcoming: tournaments.filter(isUpcoming).length,
      registrations: registrations.length,
      players: new Set(registrations.map((r) => r.user_email).filter(Boolean)).size,
      coins: w.reduce((s, x) => s + Number(x.balance || 0), 0),
      prizePool: tournaments.reduce((s, t) => s + Number(t.prize_pool || 0), 0),
      liveMatches,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(handler);
export {
  handler as default
};
