import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const USER_KEY = ['me'];
const TOURNAMENTS_KEY = ['tournaments'];
const REGISTRATIONS_KEY = ['registrations'];

async function fetchUser() {
  return base44.auth.me();
}

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

  const userQuery = useQuery({ queryKey: USER_KEY, queryFn: fetchUser, staleTime: 5 * 60 * 1000 });
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
  const user = userQuery.data ?? null;
  const tournaments = tournamentsQuery.data ?? [];
  const registrations = registrationsQuery.data ?? [];

  const reload = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: TOURNAMENTS_KEY }),
      queryClient.refetchQueries({ queryKey: REGISTRATIONS_KEY }),
    ]);
  };

  return { loading, user, tournaments, registrations, reload };
}