import { useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/callFunction';
import { useAuth } from '@/lib/AuthContext';
import { withAuth } from '@/lib/authToken';

const TOURNAMENTS_KEY = ['tournaments'];
const REGISTRATIONS_KEY = ['registrations'];

async function fetchTournaments() {
  const res = await callFunction('listTournaments', {});
  return (res?.data ?? res)?.tournaments ?? [];
}

async function fetchRegistrations() {
  const res = await callFunction('getMyRegistrations', await withAuth({}));
  const data = res?.data ?? res;
  return { registrations: data?.registrations ?? [], winnings: data?.winnings ?? [] };
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
  const error = tournamentsQuery.isError || registrationsQuery.isError;
  const tournaments = tournamentsQuery.data ?? [];
  const registrations = registrationsQuery.data?.registrations ?? [];
  const winnings = registrationsQuery.data?.winnings ?? [];

  const reload = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: TOURNAMENTS_KEY }),
      queryClient.refetchQueries({ queryKey: REGISTRATIONS_KEY }),
      refreshUser(),
    ]);
  };

  return { loading, error, user, tournaments, registrations, winnings, reload };
}