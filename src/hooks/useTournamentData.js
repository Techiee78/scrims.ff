import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const USER_KEY = ['me'];
const TOURNAMENTS_KEY = ['tournaments'];
const REGISTRATIONS_KEY = ['registrations'];

async function fetchUser() {
  return base44.auth.me();
}

async function fetchTournaments() {
  return base44.entities.Tournament.list('-created_date', 60);
}

async function fetchRegistrations() {
  const me = await base44.auth.me();
  return base44.entities.Registration.filter(
    { user_email: me.email, status: 'joined' },
    '-created_date',
    60
  );
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