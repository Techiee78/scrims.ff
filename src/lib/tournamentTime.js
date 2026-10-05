export function getTimeStatus(tournament, now = Date.now()) {
  if (tournament?.status === 'completed') return 'completed';
  const mt = tournament?.match_time ? new Date(tournament.match_time).getTime() : null;
  if (!mt) return 'upcoming';
  return mt - now > 0 ? 'upcoming' : 'live';
}