import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ResultRow from '@/components/results/ResultRow';

export default function MatchResults() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then((me) => {
      setUser(me);
      if (me?.role !== 'admin') {
        setLoading(false);
        return;
      }
      base44.functions.invoke('listTournaments', {}).then((res) => {
        setTournaments((res?.data ?? res)?.tournaments ?? []);
        setLoading(false);
      });
    });
  }, []);

  const pick = async (tournament) => {
    setSelected(tournament);
    setDraft({});
    const res = await base44.functions.invoke('getMatchRegistrations', { tournament_id: tournament.id });
    const regs = (res?.data ?? res)?.registrations ?? [];
    setRows(regs);
    const next = {};
    for (const r of regs) {
      next[r.id] = {
        kills: r.kills ? String(r.kills) : '',
        placement: r.placement ? String(r.placement) : '',
      };
    }
    setDraft(next);
  };

  const update = (id, field, value) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value.replace(/[^0-9]/g, '') },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const results = rows.map((r) => ({
        registration_id: r.id,
        kills: Number(draft[r.id]?.kills || 0),
        placement: Number(draft[r.id]?.placement || 0),
      }));
      const res = await base44.functions.invoke('recordMatchResults', {
        tournament_id: selected.id,
        results,
      });
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Could not save', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Results saved', description: `${data.saved || results.length} entries updated.` });
      }
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err?.response?.data?.error || err?.message || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">Loading…</div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="glass mt-6 rounded-3xl p-6 text-center text-sm text-muted-foreground">
        Organizer tools are admin-only.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (selected ? setSelected(null) : navigate('/admin'))}
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-lg font-semibold">Enter results</h1>
          <p className="text-[11px] text-muted-foreground">Record kills & placements for a match.</p>
        </div>
      </div>

      {!selected ? (
        <div className="space-y-2">
          {tournaments.length === 0 ? (
            <p className="glass-soft rounded-2xl px-4 py-6 text-center text-xs text-muted-foreground">
              No matches yet.
            </p>
          ) : (
            tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t)}
                className="glass-soft flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {t.mode} · {t.team_type || 'Solo'}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-primary">Select</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="glass-soft rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold">{selected.title}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {selected.mode} · {rows.length} joined
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="glass-soft rounded-2xl px-4 py-6 text-center text-xs text-muted-foreground">
              No players joined this match.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <ResultRow
                  key={r.id}
                  registration={r}
                  kills={draft[r.id]?.kills ?? ''}
                  placement={draft[r.id]?.placement ?? ''}
                  onKills={(v) => update(r.id, 'kills', v)}
                  onPlacement={(v) => update(r.id, 'placement', v)}
                />
              ))}
            </div>
          )}
          <Button
            onClick={save}
            disabled={saving || rows.length === 0}
            className="h-12 w-full rounded-full font-display font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : 'Save results'}
          </Button>
        </>
      )}
    </div>
  );
}