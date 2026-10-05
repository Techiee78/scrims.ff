import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { serviceClient } from '../../shared/supabase.ts';

// Admin-only dashboard stats.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const supa = serviceClient();
    const { data: tours } = await supa.from('tournaments').select('*').order('created_at', { ascending: false }).limit(500);
    const { data: regs } = await supa.from('registrations').select('user_email').eq('status', 'joined').limit(5000);
    const { data: wallets } = await supa.from('wallets').select('balance').limit(5000);

    const tournaments = tours || [];
    const registrations = regs || [];
    const w = wallets || [];

    return Response.json({
      tournaments: tournaments.length,
      live: tournaments.filter((t: any) => t.status === 'live').length,
      upcoming: tournaments.filter((t: any) => t.status === 'upcoming').length,
      registrations: registrations.length,
      players: new Set(registrations.map((r: any) => r.user_email).filter(Boolean)).size,
      coins: w.reduce((s: number, x: any) => s + Number(x.balance || 0), 0),
      prizePool: tournaments.reduce((s: number, t: any) => s + Number(t.prize_pool || 0), 0),
      liveMatches: tournaments.filter((t: any) => t.status === 'live'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}