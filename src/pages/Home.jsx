import { useState } from 'react';
import useTournamentData from '@/hooks/useTournamentData';
import HeroAnnouncement from '@/components/tournaments/HeroAnnouncement';
import ModeTabs from '@/components/tournaments/ModeTabs';
import TournamentCard from '@/components/tournaments/TournamentCard';
import EmptyMatches from '@/components/tournaments/EmptyMatches';
import JoinDialog from '@/components/tournaments/JoinDialog';
import PullToRefresh from '@/components/common/PullToRefresh';
import StateScreen from '@/components/states/StateScreen';
import { Loader2 } from 'lucide-react';
import { getTimeStatus } from '@/lib/tournamentTime';

export default function Home() {
  const { loading, error, user, tournaments, registrations, reload } = useTournamentData();
  const [mode, setMode] = useState('Full Map');
  const [target, setTarget] = useState(null);

  if (loading) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-[26px] px-6 py-12 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Loading matches…</p>
      </div>
    );
  }

  if (error) {
    return (
      <StateScreen
        variant="error"
        title="Couldn't load matches"
        hint="Check your connection and try again."
        showRetry
        onRetry={reload}
      />
    );
  }

  const joinedIds = new Set(registrations.map((item) => item.tournament_id));
  const regByTournament = new Map(registrations.map((r) => [r.tournament_id, r]));
  const open = tournaments.filter((item) => getTimeStatus(item) !== 'completed');
  const featured = open.find((item) => item.featured) || open[0];
  const matches = open.filter((item) => item.mode === mode);

  return (
    <PullToRefresh onRefresh={reload}>
    <div className="space-y-5">
      {featured && (
        <HeroAnnouncement
          tournament={featured}
          joined={joinedIds.has(featured.id)}
          onJoin={() => setTarget(featured)}
        />
      )}

      <div className="flex items-end justify-between px-1">
        <h2 className="font-display text-lg font-semibold">Matches</h2>
        <span className="text-[11px] text-muted-foreground">{matches.length} open</span>
      </div>

      <ModeTabs value={mode} onChange={setMode} />

      <div className="space-y-3">
        {matches.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
            joined={joinedIds.has(tournament.id)}
            registration={regByTournament.get(tournament.id)}
            onJoin={() => setTarget(tournament)}
            onUploaded={reload}
          />
        ))}
        {matches.length === 0 && (
          <EmptyMatches title={`No ${mode} matches right now`} hint="New rooms are added every day." />
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