import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { coins } from '@/lib/format';
import TournamentFormDialog from '@/components/admin/TournamentFormDialog';
import { getTimeStatus } from '@/lib/tournamentTime';

const statusLabel = (s) => (s === 'live' ? 'Live' : s === 'completed' ? 'Completed' : 'Upcoming');

export default function AdminTournaments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.Tournament.list('-created_date', 100).then((list) => {
      setItems(list);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (tournament) => {
    if (!window.confirm(`Delete "${tournament.title}"? This can't be undone.`)) return;
    try {
      const res = await base44.functions.invoke('manageTournament', {
        action: 'delete',
        tournament_id: tournament.id,
      });
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Could not delete', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Tournament deleted' });
      load();
    } catch (err) {
      toast({ title: 'Could not delete', description: err?.message, variant: 'destructive' });
    }
  };

  const handleOpen = (value) => {
    setOpen(value);
    if (!value) setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold">Tournaments</h1>
          <p className="text-[11px] text-muted-foreground">{items.length} matches</p>
        </div>
        <Button
          onClick={() => {
            setEditing('new');
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="glass-soft rounded-2xl px-4 py-6 text-center text-xs text-muted-foreground">
          No tournaments yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div
              key={t.id}
              className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t.mode} · {t.team_type || 'Solo'} · {statusLabel(getTimeStatus(t))}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t.filled_slots || 0}/{t.total_slots || 0} slots · prize {coins(t.prize_pool)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(t);
                  setOpen(true);
                }}
                className="rounded-full"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(t)}
                className="rounded-full text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <TournamentFormDialog
        open={open}
        onOpenChange={handleOpen}
        tournament={editing === 'new' ? null : editing}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}