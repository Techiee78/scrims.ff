import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const TOURNAMENTS_KEY = ['tournaments'];
const REGISTRATIONS_KEY = ['registrations'];

async function fetchTournaments() {
  const res = await base44.functions.invoke('listTournaments', {});
  return (res?.data ?? res)?.tournaments ?? [];
}

async function fetchRegistrations() {
  const res = await base44.functions.invoke('getMyRegistrations', {});
  return (res?.data ?? res)?.registrations ?? [];
}

export default function useTournamentData() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  const tournamentsQuery = useQuery({
    queryKey: TOURNAMENTS_KEY,
    queryFn: fetchTournaments,
    staleTime: 60 * 1000,
  });
  const registrationsQuery = useQuery({
    queryKey: REGISTRATIONS_KEY,
    queryFn: fetchRegistrations,
    staleTime: 60 * 1000,
  });

  const loading = tournamentsQuery.isLoading || registrationsQuery.isLoading;
  const tournaments = tournamentsQuery.data ?? [];
  const registrations = registrationsQuery.data ?? [];

  const reload = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: TOURNAMENTS_KEY }),
      queryClient.refetchQueries({ queryKey: REGISTRATIONS_KEY }),
      refreshUser(),
    ]);
  };

  return { loading, user, tournaments, registrations, reload };
}