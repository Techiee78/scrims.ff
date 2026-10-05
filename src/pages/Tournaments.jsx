import { useState } from 'react';
import useTournamentData from '@/hooks/useTournamentData';
import ModeTabs, { ALL_MODES, MATCH_MODES } from '@/components/tournaments/ModeTabs';
import TournamentCard from '@/components/tournaments/TournamentCard';
import EmptyMatches from '@/components/tournaments/EmptyMatches';
import JoinDialog from '@/components/tournaments/JoinDialog';
import PullToRefresh from '@/components/common/PullToRefresh';

const FILTERS = [...ALL_MODES, ...MATCH_MODES];

export default function Tournaments() {
  const { loading, user, tournaments, registrations, reload } = useTournamentData();
  const [filter, setFilter] = useState('All');
  const [target, setTarget] = useState(null);

  const joinedIds = new Set(registrations.map((item) => item.tournament_id));
  const regByTournament = new Map(registrations.map((r) => [r.tournament_id, r]));
  const list = tournaments.filter((item) => filter === 'All' || item.mode === filter);

  return (
    <PullToRefresh onRefresh={reload}>
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="font-display text-2xl font-semibold">Tournaments</h1>
        <p className="text-xs text-muted-foreground">Pick a room, book your slot, drop in.</p>
      </div>

      <ModeTabs value={filter} onChange={setFilter} options={FILTERS} />

      <div className="space-y-3">
        {loading && <div className="h-44 animate-pulse rounded-[26px] bg-white/5" />}
        {!loading &&
          list.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              joined={joinedIds.has(tournament.id)}
              registration={regByTournament.get(tournament.id)}
              onJoin={() => setTarget(tournament)}
              onUploaded={reload}
            />
          ))}
        {!loading && list.length === 0 && (
          <EmptyMatches title="Nothing here yet" hint="Try another format — new rooms drop daily." />
        )}
      </div>

      <JoinDialog
        tournament={target}
        open={!!target}
        onOpenChange={(open) => !open && setTarget(null)}
        user={user}
        onJoined={() => {
          setTarget(null);
          reload();
        }}
      />
    </div>
    </PullToRefresh>
  );
}