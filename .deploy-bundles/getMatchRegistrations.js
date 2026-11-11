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

// supabase/functions/getMatchRegistrations/index.ts
async function handler(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
    const body = await req.json();
    const tournamentId = body.tournament_id;
    if (!tournamentId) return Response.json({ error: "Missing tournament" }, { status: 400 });
    const supa = serviceClient();
    const { data, error } = await supa.from("registrations").select("*").eq("tournament_id", tournamentId).eq("status", "joined").order("slot_number", { ascending: true }).limit(200);
    if (error) throw error;
    return Response.json({ registrations: data || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(handler);
export {
  handler as default
};
