import { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { callFunction } from '@/lib/callFunction';

export default function JoinedMembers({ tournamentId, capacity, filled }) {
  const [state, setState] = useState({ loading: true, players: [], error: '' });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, players: [], error: '' });
    callFunction('getMatchPlayers', { tournament_id: tournamentId })
      .then((res) => {
        if (!alive) return;
        const data = res?.data ?? res;
        if (data?.error) throw new Error(data.error);
        setState({ loading: false, players: data?.players ?? [], error: '' });
      })
      .catch((err) => {
        if (!alive) return;
        setState({ loading: false, players: [], error: err?.message || 'Could not load players' });
      });
    return () => {
      alive = false;
    };
  }, [tournamentId]);

  const booked = Math.max(Number(filled || 0), state.players.length);

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-accent">
          <Users className="h-3.5 w-3.5" />
          Joined members
        </h2>
        <span className="text-xs text-muted-foreground">
          {booked} / {capacity} slots
        </span>
      </div>

      {state.loading && (
        <div className="glass-soft flex items-center justify-center gap-2 rounded-2xl px-3.5 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Loading players…
        </div>
      )}

      {!state.loading && state.error && (
        <p className="glass-soft rounded-2xl px-3.5 py-4 text-xs text-destructive">{state.error}</p>
      )}

      {!state.loading && !state.error && state.players.length === 0 && (
        <p className="glass-soft rounded-2xl px-3.5 py-4 text-xs text-muted-foreground">
          No players yet — be the first to book a slot.
        </p>
      )}

      {!state.loading && !state.error && state.players.length > 0 && (
        <ul className="space-y-2">
          {state.players.map((player, index) => (
            <li
              key={`${player.slot ?? index}-${player.ign}`}
              className="glass-soft flex items-center gap-3 rounded-2xl px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 font-display text-[11px] font-bold text-primary">
                {player.slot ?? index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{player.ign || 'Player'}</span>
                {player.teammates.length > 0 && (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    with {player.teammates.join(' · ')}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}