import { useState } from 'react';
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
  return {
    registrations: data?.registrations ?? [],
    winnings: data?.winnings ?? [],
    rooms: data?.rooms ?? [],
  };
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
    // Results and prizes change the moment an admin saves a match, so always
    // re-read them when a page opens instead of serving a minute-old cache.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Slots booked in this session before the server has answered, so a card
  // flips to "booked" the moment the player confirms.
  const [pendingJoins, setPendingJoins] = useState([]);

  const loading = tournamentsQuery.isLoading || registrationsQuery.isLoading;
  const error = tournamentsQuery.isError || registrationsQuery.isError;
  const tournaments = tournamentsQuery.data ?? [];
  const registrations = [...(registrationsQuery.data?.registrations ?? []), ...pendingJoins];
  const winnings = registrationsQuery.data?.winnings ?? [];
  // Room ID / password for the matches this player joined — the public board
  // does not carry them.
  const rooms = registrationsQuery.data?.rooms ?? [];

  const reload = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: TOURNAMENTS_KEY }),
      queryClient.refetchQueries({ queryKey: REGISTRATIONS_KEY }),
      refreshUser(),
    ]);
  };

  const joinOptimistic = (registration) =>
    setPendingJoins((prev) => [...prev, registration]);

  const rollbackJoin = (tournamentId) =>
    setPendingJoins((prev) => prev.filter((item) => item.tournament_id !== tournamentId));

  // Keep the optimistic slot until the server data already contains it.
  const settleJoin = async (tournamentId) => {
    await reload();
    setPendingJoins((prev) => prev.filter((item) => item.tournament_id !== tournamentId));
  };

  return {
    loading,
    error,
    user,
    tournaments,
    registrations,
    winnings,
    rooms,
    reload,
    joinOptimistic,
    rollbackJoin,
    settleJoin,
  };
}