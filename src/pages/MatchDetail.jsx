import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Swords } from 'lucide-react';
import useTournamentData from '@/hooks/useTournamentData';
import ScreenHeader from '@/components/layout/ScreenHeader';
import StateScreen from '@/components/states/StateScreen';
import MatchTabs from '@/components/match/MatchTabs';
import MatchInfoGrid from '@/components/match/MatchInfoGrid';
import PrizeDetails from '@/components/match/PrizeDetails';
import MatchRules from '@/components/match/MatchRules';
import JoinedMembers from '@/components/match/JoinedMembers';
import MatchJoinBar from '@/components/match/MatchJoinBar';
import { slotCapacity } from '@/lib/slots';

export default function MatchDetail() {
  const { id } = useParams();
  const {
    loading,
    error,
    user,
    tournaments,
    registrations,
    reload,
    joinOptimistic,
    rollbackJoin,
    settleJoin,
  } = useTournamentData();
  const [tab, setTab] = useState('description');

  const tournament = tournaments.find((item) => String(item.id) === String(id));

  if (loading) {
    return (
      <div className="glass flex items-center justify-center rounded-[26px] px-6 py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <StateScreen
        variant="error"
        title="Couldn't load this match"
        hint="Check your connection and try again."
        showRetry
        onRetry={reload}
      />
    );
  }

  if (!tournament) {
    return (
      <StateScreen
        variant="empty"
        title="Match not found"
        hint="This room may have been removed."
        actionLabel="Browse tournaments"
        actionTo="/tournaments"
      />
    );
  }

  const capacity = slotCapacity(tournament.mode, tournament.team_type);
  const joined = registrations.some((item) => String(item.tournament_id) === String(tournament.id));

  return (
    <div className="space-y-4">
      <ScreenHeader
        title={tournament.title}
        subtitle={`${tournament.mode || 'Full Map'} · ${tournament.team_type || 'Solo'}`}
        icon={Swords}
      />

      <MatchTabs value={tab} onChange={setTab} memberCount={tournament.filled_slots || 0} />

      {tab === 'description' ? (
        <div className="space-y-4">
          <MatchInfoGrid tournament={tournament} />
          <PrizeDetails tournament={tournament} />
          <MatchRules description={tournament.description} />
          <MatchJoinBar
            tournament={tournament}
            user={user}
            joined={joined}
            onOptimistic={joinOptimistic}
            onRollback={rollbackJoin}
            onSettled={settleJoin}
          />
        </div>
      ) : (
        <JoinedMembers
          tournamentId={tournament.id}
          capacity={capacity}
          filled={tournament.filled_slots || 0}
        />
      )}
    </div>
  );
}