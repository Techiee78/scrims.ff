import { useState } from 'react';
import useTournamentData from '@/hooks/useTournamentData';
import HeroAnnouncement from '@/components/tournaments/HeroAnnouncement';
import ModeTabs from '@/components/tournaments/ModeTabs';
import TournamentCard from '@/components/tournaments/TournamentCard';
import EmptyMatches from '@/components/tournaments/EmptyMatches';
import JoinDialog from '@/components/tournaments/JoinDialog';
import PullToRefresh from '@/components/common/PullToRefresh';

export default function Home() {
  const { loading, user, tournaments, registrations, reload } = useTournamentData();
  const [mode, setMode] = useState('Full Map');
  const [target, setTarget] = useState(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-72 animate-pulse rounded-[30px] bg-white/5" />
        <div className="h-16 animate-pulse rounded-[26px] bg-white/5" />
        <div className="h-44 animate-pulse rounded-[26px] bg-white/5" />
      </div>
    );
  }

  const joinedIds = new Set(registrations.map((item) => item.tournament_id));
  const featured = tournaments.find((item) => item.featured) || tournaments[0];
  const matches = tournaments.filter((item) => item.mode === mode);

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
            onJoin={() => setTarget(tournament)}
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