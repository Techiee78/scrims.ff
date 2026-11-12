import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { callFunction } from '@/lib/callFunction';
import { useAuth } from '@/lib/AuthContext';
import { withAuth } from '@/lib/authToken';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ResultRow from '@/components/results/ResultRow';
import PayoutPreview from '@/components/results/PayoutPreview';
import StateScreen from '@/components/states/StateScreen';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { coins as formatCoins } from '@/lib/format';
import { matchPayout, podiumSplit } from '@/lib/prizes';

export default function MatchResults() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    callFunction('listTournaments', {}).then((res) => {
      setTournaments((res?.data ?? res)?.tournaments ?? []);
      setLoading(false);
    });
  }, [user]);

  const pick = async (tournament) => {
    setSelected(tournament);
    setDraft({});
    setConfirmOpen(false);
    const res = await callFunction('getMatchRegistrations', await withAuth({ tournament_id: tournament.id }));
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
      const res = await callFunction('recordMatchResults', await withAuth({
        tournament_id: selected.id,
        results,
      }));
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Could not save', description: data.error, variant: 'destructive' });
      } else {
        toast({
          title: 'Results saved',
          description: data.paid
            ? `${data.saved || results.length} entries updated · ₹${data.payoutTotal} coins paid to ${data.paid} player${data.paid === 1 ? '' : 's'}.`
            : `${data.saved || results.length} entries updated.`,
        });
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
      <StateScreen
        variant="permission"
        title="Admin access only"
        hint="Organizer tools are restricted to tournament organizers. Contact an admin if you need access."
        actionLabel="Back to home"
        actionTo="/"
      />
    );
  }

  const perKill = Number(selected?.per_kill || 0);
  const prizePool = Number(selected?.prize_pool || 0);
  const split = podiumSplit(selected);

  const payoutFor = (reg) =>
    matchPayout(
      selected,
      Number(draft[reg.id]?.kills || 0),
      Number(draft[reg.id]?.placement || 0)
    );
  const payable = rows.reduce((sum, reg) => sum + payoutFor(reg), 0);
  const payableCount = rows.filter((reg) => payoutFor(reg) > 0).length;

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
          {(perKill > 0 || prizePool > 0) && (
            <PayoutPreview
              prizePool={prizePool}
              prize1={split.first}
              prize2={split.second}
              prize3={split.third}
              perKill={perKill}
              payable={payable}
              players={payableCount}
            />
          )}
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
                  payout={payoutFor(r)}
                />
              ))}
            </div>
          )}
          <Button
            onClick={() => (payable > 0 ? setConfirmOpen(true) : save())}
            disabled={saving || rows.length === 0}
            className="h-12 w-full rounded-full font-display font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : payable > 0 ? 'Save & distribute winnings' : 'Save results'}
          </Button>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent className="glass-strong w-[calc(100%-1.5rem)] max-w-md rounded-[26px] border-white/10">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="font-display text-base">
                  Distribute {formatCoins(payable)} coins?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[11px]">
                  {payableCount} player{payableCount === 1 ? '' : 's'} will get coins in their wallet from
                  the {formatCoins(prizePool)} prize pool — 1st {formatCoins(split.first)}, 2nd{' '}
                  {formatCoins(split.second)}, 3rd {formatCoins(split.third)} — plus{' '}
                  {formatCoins(perKill)} per kill. Each match is paid out only once.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={save} className="rounded-full">
                  Distribute winnings
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}