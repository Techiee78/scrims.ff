import { useState } from 'react';
import { Search, X } from 'lucide-react';
import useTournamentData from '@/hooks/useTournamentData';
import ModeTabs, { ALL_MODES, MATCH_MODES } from '@/components/tournaments/ModeTabs';
import TournamentCard from '@/components/tournaments/TournamentCard';
import EmptyMatches from '@/components/tournaments/EmptyMatches';
import JoinDialog from '@/components/tournaments/JoinDialog';
import PullToRefresh from '@/components/common/PullToRefresh';
import StateScreen from '@/components/states/StateScreen';

const FILTERS = [...ALL_MODES, ...MATCH_MODES];

export default function Tournaments() {
  const { loading, error, user, tournaments, registrations, reload } = useTournamentData();
  const [filter, setFilter] = useState('All');
  const [target, setTarget] = useState(null);
  const [query, setQuery] = useState('');

  const joinedIds = new Set(registrations.map((item) => item.tournament_id));
  const regByTournament = new Map(registrations.map((r) => [r.tournament_id, r]));
  const list = tournaments.filter((item) => {
    const modeOk = filter === 'All' || item.mode === filter;
    const q = query.trim().toLowerCase();
    const queryOk = !q || (item.title || '').toLowerCase().includes(q) || (item.map || '').toLowerCase().includes(q);
    return modeOk && queryOk;
  });

  return (
    <PullToRefresh onRefresh={reload}>
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="font-display text-2xl font-semibold">Tournaments</h1>
        <p className="text-xs text-muted-foreground">Pick a room, book your slot, drop in.</p>
      </div>

      <div className="glass-soft flex items-center gap-2 rounded-full px-3.5 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms or maps"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ModeTabs value={filter} onChange={setFilter} options={FILTERS} />

      <div className="space-y-3">
        {loading && <div className="h-44 animate-pulse rounded-[26px] bg-white/5" />}
        {!loading && error && (
          <StateScreen
            variant="error"
            title="Couldn't load tournaments"
            hint="Pull down to refresh, or try again."
            showRetry
            onRetry={reload}
          />
        )}
        {!loading && !error &&
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
        {!loading && !error && list.length === 0 && query.trim() && (
          <StateScreen
            variant="noResult"
            title="No rooms found"
            hint={`Nothing matches "${query.trim()}". Try a different search.`}
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        )}
        {!loading && !error && list.length === 0 && !query.trim() && (
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