import { Link } from 'react-router-dom';
import { Clock, Hash, KeyRound, Trophy } from 'lucide-react';
import useTournamentData from '@/hooks/useTournamentData';
import EmptyMatches from '@/components/tournaments/EmptyMatches';
import StandingsUpload from '@/components/matches/StandingsUpload';
import LiveStatus from '@/components/tournaments/LiveStatus';
import StateScreen from '@/components/states/StateScreen';
import { matchTime } from '@/lib/format';
import { getTimeStatus } from '@/lib/tournamentTime';

export default function MyMatches() {
  const { loading, error, tournaments, registrations, reload } = useTournamentData();
  const byId = new Map(tournaments.map((item) => [item.id, item]));

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="font-display text-2xl font-semibold">My Matches</h1>
        <p className="text-xs text-muted-foreground">Your booked slots and room details.</p>
      </div>

      {loading && <div className="h-40 animate-pulse rounded-[26px] bg-white/5" />}

      <div className="space-y-3">
        {!loading && error && (
          <StateScreen
            variant="error"
            title="Couldn't load your matches"
            hint="Pull down or retry to see your booked slots."
            showRetry
            onRetry={reload}
          />
        )}
        {!loading && !error &&
          registrations.map((registration) => {
            const match = byId.get(registration.tournament_id);
            return (
              <article key={registration.id} className="glass rounded-[26px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="glass-soft inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                        {registration.mode}
                      </span>
                      {match && <LiveStatus tournament={match} />}
                    </div>
                    <h3 className="mt-2 truncate font-display text-base font-semibold">
                      {registration.tournament_title}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {matchTime(match?.match_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Slot {registration.slot_number}
                      </span>
                    </p>
                  </div>
                  <span className="glass-soft flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    <Trophy className="h-3 w-3" />
                    Joined
                  </span>
                </div>

                <div className="glass-soft mt-3.5 grid grid-cols-2 gap-2 rounded-2xl px-3.5 py-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Room ID</p>
                    <p className="font-display text-sm font-semibold">{match?.room_id || '—'}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      <KeyRound className="h-2.5 w-2.5" />
                      Password
                    </p>
                    <p className="font-display text-sm font-semibold">{match?.room_password || '—'}</p>
                  </div>
                </div>

                {match && getTimeStatus(match) === 'completed' && (
                  <StandingsUpload registration={registration} onUploaded={reload} />
                )}
              </article>
            );
          })}
      </div>

      {!loading && !error && registrations.length === 0 && (
        <EmptyMatches
          title="No matches booked yet"
          hint="Join a Full Map or CS room from the home screen."
        />
      )}

      <Link
        to="/tournaments"
        className="glass flex items-center justify-center rounded-full py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Browse tournaments
      </Link>
    </div>
  );
}