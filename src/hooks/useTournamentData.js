import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useTournamentData() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  const load = useCallback(async () => {
    const me = await base44.auth.me();
    const [matches, myRegistrations] = await Promise.all([
      base44.entities.Tournament.list('-created_date', 60),
      base44.entities.Registration.filter(
        { user_email: me.email, status: 'joined' },
        '-created_date',
        60
      ),
    ]);
    setUser(me);
    setTournaments(matches);
    setRegistrations(myRegistrations);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, user, tournaments, registrations, reload: load };
}